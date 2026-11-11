// Supabase Edge Function: public-quote
// Serves public quote estimates to customers via share_token without requiring authentication.
// Also processes customer Accept and Decline actions.

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
    const supabaseUrl =
      Deno.env.get('SUPABASE_URL') ||
      Deno.env.get('VITE_SUPABASE_URL') ||
      '';
    const supabaseServiceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
      Deno.env.get('SUPABASE_ANON_KEY') ||
      Deno.env.get('VITE_SUPABASE_ANON_KEY') ||
      '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase environment configuration missing in Edge Function' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        JSON.stringify({ error: 'A valid share_token is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch Quote by share_token
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*, customers(name, phone, email, address), workspaces(business_name, trade_type, phone, email, currency)')
      .eq('share_token', token.trim())
      .maybeSingle();

    if (quoteError || !quote) {
      return new Response(
        JSON.stringify({ error: 'Quote not found or invalid share token.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quote.id)
        .select()
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: `Failed to ${action} quote: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: newStatus,
          message: `Quote successfully ${newStatus}.`,
          quote: updatedQuote,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Fetch line items for the quote
    const { data: lineItems, error: itemsError } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quote.id)
      .order('id', { ascending: true });

    if (itemsError) {
      console.warn('Error fetching quote line items:', itemsError.message);
    }

    // Return sanitized public quote view
    const responsePayload = {
      id: quote.id,
      quote_number: quote.quote_number,
      title: quote.title,
      status: quote.status,
      subtotal: quote.subtotal,
      tax_percent: quote.tax_percent,
      total: quote.total,
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
    const msg = err instanceof Error ? err.message : 'Unknown server error';
    console.error('public-quote error:', msg);
    return new Response(
      JSON.stringify({ error: 'Internal server error loading public quote', details: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
