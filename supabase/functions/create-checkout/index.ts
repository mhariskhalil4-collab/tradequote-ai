// Supabase Edge Function: create-checkout
// Creates a Stripe Checkout session for invoice payment using STRIPE_SECRET_KEY.
// Saves stripe_session_id and stripe_checkout_url on the invoice, and returns the checkout URL.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
    if (!stripeSecretKey) {
      console.error('Missing STRIPE_SECRET_KEY in Edge Function environment');
      return new Response(
        JSON.stringify({ error: 'STRIPE_SECRET_KEY is not configured in Edge Function' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = supabaseUrl && serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

    // Support verify action via GET ?session_id=...
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get('session_id');
      const invoiceId = url.searchParams.get('invoice_id');

      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: 'session_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Query Stripe session
      const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${stripeSecretKey}` },
      });
      const session = await stripeRes.json();

      if (!stripeRes.ok) {
        return new Response(
          JSON.stringify({ error: session.error?.message || 'Failed to retrieve session from Stripe' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isPaid = session.payment_status === 'paid';
      if (isPaid && supabase) {
        const updatePayload = {
          status: 'paid',
          paid_at: new Date().toISOString(),
          stripe_payment_id: session.payment_intent || null,
        };

        if (invoiceId) {
          await supabase.from('invoices').update(updatePayload).eq('id', invoiceId);
        } else {
          await supabase.from('invoices').update(updatePayload).eq('stripe_session_id', sessionId);
        }
      }

      return new Response(
        JSON.stringify({
          paid: isPaid,
          status: session.payment_status,
          payment_intent: session.payment_intent,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Create checkout session
    const body = await req.json().catch(() => ({}));
    const {
      invoice_id,
      invoice_number,
      amount,
      currency,
      customer_email,
      customer_name,
      origin,
    } = body;

    let targetInvoiceId = invoice_id;
    let targetInvoiceNumber = invoice_number || 'INV-1001';
    let targetAmount = Number(amount) || 0;
    let targetCurrency = (currency || 'USD').toLowerCase();

    // If invoice_id provided and supabase client available, fetch invoice details
    if (supabase && targetInvoiceId) {
      try {
        const { data: inv } = await supabase
          .from('invoices')
          .select('*, customers(name, email), workspaces(currency)')
          .eq('id', targetInvoiceId)
          .maybeSingle();

        if (inv) {
          if (!targetAmount) targetAmount = Number(inv.amount) || 0;
          if (!targetInvoiceNumber) targetInvoiceNumber = inv.invoice_number || 'INV-1001';
          if (inv.workspaces?.currency) targetCurrency = inv.workspaces.currency.toLowerCase();
        }
      } catch (dbErr) {
        console.warn('Could not query invoice from DB, using payload values:', dbErr);
      }
    }

    if (targetAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invoice amount must be greater than zero' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine redirect URLs
    const baseOrigin = origin || 'http://localhost:5173';
    const successUrl = `${baseOrigin}/invoices?session_id={CHECKOUT_SESSION_ID}&paid=true`;
    const cancelUrl = `${baseOrigin}/invoices?canceled=true`;

    // Build Stripe Checkout Session form data
    const unitAmountCents = Math.round(targetAmount * 100);
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', successUrl);
    params.append('cancel_url', cancelUrl);
    params.append('line_items[0][price_data][currency]', targetCurrency);
    params.append('line_items[0][price_data][product_data][name]', `Invoice ${targetInvoiceNumber}`);
    if (customer_name) {
      params.append('line_items[0][price_data][product_data][description]', `Billed to ${customer_name}`);
    }
    params.append('line_items[0][price_data][unit_amount]', unitAmountCents.toString());
    params.append('line_items[0][quantity]', '1');

    if (targetInvoiceId) {
      params.append('client_reference_id', targetInvoiceId);
      params.append('metadata[invoice_id]', targetInvoiceId);
    }
    params.append('metadata[invoice_number]', targetInvoiceNumber);

    if (customer_email) {
      params.append('customer_email', customer_email);
    }

    // Call Stripe API
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      console.error('Stripe API error:', session);
      return new Response(
        JSON.stringify({ error: session.error?.message || 'Failed to create Stripe Checkout session' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update invoice row in Supabase with stripe_session_id and stripe_checkout_url
    if (supabase && targetInvoiceId) {
      try {
        await supabase
          .from('invoices')
          .update({
            stripe_session_id: session.id,
            stripe_checkout_url: session.url,
          })
          .eq('id', targetInvoiceId);
      } catch (upErr) {
        console.warn('Could not update invoice with Stripe session:', upErr);
      }
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        session_id: session.id,
        invoice_id: targetInvoiceId,
        invoice_number: targetInvoiceNumber,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown server error';
    console.error('create-checkout error:', err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
