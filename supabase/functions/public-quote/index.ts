// Supabase Edge Function: public-quote
// Serves public quote estimates to customers via share_token without requiring authentication.
// Also processes customer Accept and Decline actions.
// Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security server-side (never exposed to browser).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL') || '';
    // Service role key is server-side ONLY, never in the browser
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in edge function environment');
      return new Response(
        JSON.stringify({ error: 'Quote not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client strictly with the SERVICE ROLE key to bypass RLS server-side
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Extract token & action from GET params or POST body
    let token = '';
    let action: 'accept' | 'decline' | undefined;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      token = url.searchParams.get('token') || '';
      action = (url.searchParams.get('action') as 'accept' | 'decline') || undefined;
    } else {
      const body = await req.json().catch(() => ({}));
      token = body.token || '';
      action = body.action;
    }

    if (!token || token.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Quote not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch Quote by share_token using SERVICE ROLE key (uses .limit(1) to prevent .single() errors)
    const { data: quotesList, error: quoteError } = await supabase
      .from('quotes')
      .select('*, customers(name, phone, email, address), workspaces(business_name, trade_type, phone, email, currency)')
      .eq('share_token', token.trim())
      .limit(1);

    if (quoteError) {
      console.error('Database query error in public-quote:', quoteError.message);
      return new Response(
        JSON.stringify({ error: 'Quote not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!quotesList || quotesList.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Quote not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const quote = quotesList[0];

    // Check expiration status
    const isExpired = quote.expires_at ? new Date(quote.expires_at) < new Date() : false;

    // 3. Handle Accept / Decline Action
    if (action === 'accept' || action === 'decline') {
      if (isExpired) {
        return new Response(
          JSON.stringify({ error: 'This quote link has expired. It cannot be accepted or declined.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newStatus = action === 'accept' ? 'accepted' : 'declined';
      const { data: updatedQuotes, error: updateError } = await supabase
        .from('quotes')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quote.id)
        .select()
        .limit(1);

      if (updateError || !updatedQuotes || updatedQuotes.length === 0) {
        return new Response(
          JSON.stringify({ error: `Failed to ${action} quote` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: newStatus,
          message: `Quote successfully ${newStatus}.`,
          quote: updatedQuotes[0],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Fetch line items for the quote
    const { data: lineItems } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quote.id)
      .order('id', { ascending: true });

    // Return sanitized public quote view
    const responsePayload = {
      id: quote.id,
      quote_number: quote.quote_number,
      title: quote.title,
      status: quote.status,
      subtotal: Number(quote.subtotal) || 0,
      tax_percent: Number(quote.tax_percent) || 0,
      total: Number(quote.total) || 0,
      notes: quote.notes,
      expires_at: quote.expires_at,
      created_at: quote.created_at,
      is_expired: isExpired,
      customer: quote.customers || null,
      workspace: quote.workspaces || null,
      line_items: lineItems || [],
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('public-quote error:', err);
    return new Response(
      JSON.stringify({ error: 'Quote not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
