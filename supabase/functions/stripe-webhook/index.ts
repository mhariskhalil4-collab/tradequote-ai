// Supabase Edge Function: stripe-webhook
// Handles Stripe Webhooks (e.g. checkout.session.completed)
// On checkout.session.completed: updates the invoice status to 'paid', sets paid_at and stripe_payment_id.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = supabaseUrl && serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

    const payload = await req.text();
    let event: any = null;

    try {
      event = JSON.parse(payload);
    } catch (parseErr) {
      console.error('Failed to parse webhook JSON:', parseErr);
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Received Stripe webhook event: ${event.type}`);

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      if (!session) {
        return new Response(JSON.stringify({ error: 'No session object in event data' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const invoiceId = session.client_reference_id || session.metadata?.invoice_id;
      const sessionId = session.id;
      const paymentIntentId = session.payment_intent || null;
      const paidAt = new Date().toISOString();

      console.log(`Processing completed checkout for invoice: ${invoiceId}, session: ${sessionId}`);

      if (supabase) {
        const updatePayload = {
          status: 'paid',
          paid_at: paidAt,
          stripe_payment_id: paymentIntentId,
        };

        let updated = false;

        // Try updating by invoiceId
        if (invoiceId) {
          const { data, error } = await supabase
            .from('invoices')
            .update(updatePayload)
            .eq('id', invoiceId)
            .select();

          if (!error && data && data.length > 0) {
            updated = true;
            console.log(`Invoice ${invoiceId} updated to paid by ID`);
          }
        }

        // Fallback update by stripe_session_id
        if (!updated && sessionId) {
          const { data, error } = await supabase
            .from('invoices')
            .update(updatePayload)
            .eq('stripe_session_id', sessionId)
            .select();

          if (!error && data && data.length > 0) {
            console.log(`Invoice updated to paid by stripe_session_id: ${sessionId}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true, event_type: event.type }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown webhook error';
    console.error('stripe-webhook error:', err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
