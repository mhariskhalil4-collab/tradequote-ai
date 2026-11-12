import { supabase } from '../lib/supabase';
import type { Invoice, InvoiceStatus, QuoteWithCustomer, QuoteLineItem } from '../types/database';
import type { InvoiceWithCustomer } from '../utils/pdfGenerator';

export type { InvoiceWithCustomer };

const EDGE_FUNCTION_URL = 'https://jfkyiuqwuoeofhepipjj.supabase.co/functions/v1/create-checkout';

/**
 * Fetches all invoices for a workspace.
 */
export async function fetchInvoices(
  workspaceId: string
): Promise<{ data: InvoiceWithCustomer[] | null; error: string | null }> {
  try {
    // 1. Try relational query
    const { data: dbInvoices, error } = await supabase
      .from('invoices')
      .select('*, customers(name, phone, email, address), quotes(quote_number, title)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Relational fetch error, attempting simple query:', error.message);
      // Fallback simple query
      const { data: simpleInvoices, error: simpleErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (simpleErr) {
        // Fallback to local storage
        const cached = getCachedInvoices(workspaceId);
        return { data: cached, error: null };
      }

      // Populate customer info
      const populated: InvoiceWithCustomer[] = await Promise.all(
        (simpleInvoices || []).map(async (inv) => {
          let customer = null;
          if (inv.customer_id) {
            const { data: c } = await supabase.from('customers').select('*').eq('id', inv.customer_id).maybeSingle();
            customer = c;
          }
          return {
            ...inv,
            customer,
            line_items: getInvoiceLineItems(inv.id, inv.quote_id),
          };
        })
      );

      return { data: populated, error: null };
    }

    const formatted: InvoiceWithCustomer[] = (dbInvoices || []).map((inv: any) => ({
      ...inv,
      customer: inv.customers || null,
      line_items: getInvoiceLineItems(inv.id, inv.quote_id),
    }));

    // Cache invoices
    setCachedInvoices(workspaceId, formatted);

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch invoices.';
    const cached = getCachedInvoices(workspaceId);
    return { data: cached, error: msg };
  }
}

/**
 * Creates one invoice row from an accepted quote and copies line items.
 */
export async function createInvoiceFromQuote(
  quote: QuoteWithCustomer,
  workspaceId: string
): Promise<{ data: InvoiceWithCustomer | null; error: string | null }> {
  try {
    // 1. Fetch line items from quote
    let lineItems: QuoteLineItem[] = quote.quote_line_items || [];
    if (lineItems.length === 0) {
      const { data: dbItems } = await supabase
        .from('quote_line_items')
        .select('*')
        .eq('quote_id', quote.id)
        .order('id', { ascending: true });

      if (dbItems && dbItems.length > 0) {
        lineItems = dbItems;
      }
    }

    // 2. Generate invoice number e.g. INV-1001
    let invoiceNumber = 'INV-1001';
    if (quote.quote_number) {
      const digits = quote.quote_number.replace(/\D/g, '');
      if (digits) {
        invoiceNumber = `INV-${digits}`;
      }
    }

    // Check existing invoices to avoid duplicate number
    try {
      const { data: existing } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('workspace_id', workspaceId);

      if (existing && existing.length > 0) {
        const nums = existing
          .map((i) => parseInt(i.invoice_number.replace(/\D/g, ''), 10))
          .filter((n) => !isNaN(n));

        if (nums.length > 0) {
          const maxNum = Math.max(...nums);
          // If invoiceNumber already taken, increment
          if (existing.some((i) => i.invoice_number === invoiceNumber)) {
            invoiceNumber = `INV-${maxNum + 1}`;
          }
        }
      }
    } catch {}

    const amount = Number(quote.total) || 0;
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const insertPayload = {
      workspace_id: workspaceId,
      quote_id: quote.id,
      customer_id: quote.customer_id,
      invoice_number: invoiceNumber,
      amount,
      status: 'unpaid' as InvoiceStatus,
      due_date: dueDate,
      created_at: new Date().toISOString(),
    };

    // 3. Insert into Supabase invoices table
    let createdInvoice: Invoice | null = null;
    const { data: insertedList, error: insertError } = await supabase
      .from('invoices')
      .insert([insertPayload])
      .select()
      .limit(1);

    if (insertError) {
      console.warn('Failed to insert invoice into Supabase:', insertError.message);
      // Generate a client-side ID for offline/cache fallback
      createdInvoice = {
        id: crypto.randomUUID(),
        ...insertPayload,
        stripe_checkout_url: null,
        stripe_session_id: null,
        stripe_payment_id: null,
        paid_at: null,
      };
    } else if (insertedList && insertedList.length > 0) {
      createdInvoice = insertedList[0] as Invoice;
    }

    if (!createdInvoice) {
      return { data: null, error: 'Could not create invoice record.' };
    }

    // 4. Copy line items and associate with invoice
    saveInvoiceLineItems(createdInvoice.id, quote.id, lineItems);

    const fullInvoice: InvoiceWithCustomer = {
      ...createdInvoice,
      customer: quote.customer || quote.customers || null,
      line_items: lineItems,
    };

    // Update cache
    const existingCached = getCachedInvoices(workspaceId);
    setCachedInvoices(workspaceId, [fullInvoice, ...existingCached.filter((i) => i.id !== fullInvoice.id)]);

    return { data: fullInvoice, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create invoice.';
    console.error('createInvoiceFromQuote error:', err);
    return { data: null, error: msg };
  }
}

/**
 * Creates a Stripe Checkout session for the invoice using the Edge Function.
 */
export async function createCheckoutSession(
  invoice: InvoiceWithCustomer,
  origin: string = window.location.origin
): Promise<{ url: string | null; session_id: string | null; error: string | null }> {
  try {
    const customer = invoice.customer || invoice.customers;
    const payload = {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      amount: invoice.amount,
      customer_name: customer?.name || 'Customer',
      customer_email: customer?.email || undefined,
      origin,
    };

    let url: string | null = null;
    let sessionId: string | null = null;

    // 1. Try Supabase functions invoke
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: payload,
      });

      if (!error && data?.url) {
        url = data.url;
        sessionId = data.session_id;
      }
    } catch (edgeErr) {
      console.info('Edge function invoke fallback:', edgeErr);
    }

    // 2. Direct fetch to deployed Edge Function
    if (!url) {
      const directRes = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (directRes.ok) {
        const directData = await directRes.json();
        if (directData?.url) {
          url = directData.url;
          sessionId = directData.session_id;
        }
      } else {
        const errData = await directRes.json().catch(() => ({}));
        throw new Error(errData.error || `Stripe checkout error (${directRes.status})`);
      }
    }

    if (!url) {
      return { url: null, session_id: null, error: 'Could not generate Stripe Checkout session.' };
    }

    // Save session id and checkout url in Supabase
    try {
      await supabase
        .from('invoices')
        .update({
          stripe_checkout_url: url,
          stripe_session_id: sessionId,
        })
        .eq('id', invoice.id);
    } catch {}

    // Update local cache
    updateCachedInvoice(invoice.workspace_id, invoice.id, {
      stripe_checkout_url: url,
      stripe_session_id: sessionId,
    });

    return { url, session_id: sessionId, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create payment link.';
    console.error('createCheckoutSession error:', err);
    return { url: null, session_id: null, error: msg };
  }
}

/**
 * Verifies if a Stripe Checkout session has been completed and marks the invoice as paid.
 */
export async function verifyCheckoutSession(
  sessionId: string,
  invoiceId?: string
): Promise<{ paid: boolean; payment_intent?: string; error: string | null }> {
  try {
    // Call Edge Function GET with session_id
    const queryUrl = `${EDGE_FUNCTION_URL}?session_id=${encodeURIComponent(sessionId)}${
      invoiceId ? `&invoice_id=${encodeURIComponent(invoiceId)}` : ''
    }`;

    const res = await fetch(queryUrl);
    if (!res.ok) {
      return { paid: false, error: 'Failed to verify session' };
    }

    const data = await res.json();
    return {
      paid: Boolean(data.paid),
      payment_intent: data.payment_intent,
      error: null,
    };
  } catch (err: unknown) {
    return { paid: false, error: err instanceof Error ? err.message : 'Verification error' };
  }
}

/**
 * Updates an invoice status directly.
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  workspaceId: string,
  status: InvoiceStatus,
  paymentId?: string
): Promise<{ error: string | null }> {
  try {
    const updatePayload: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'paid') {
      updatePayload.paid_at = new Date().toISOString();
      if (paymentId) updatePayload.stripe_payment_id = paymentId;
    }

    await supabase.from('invoices').update(updatePayload).eq('id', invoiceId);
    updateCachedInvoice(workspaceId, invoiceId, updatePayload);

    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to update status' };
  }
}

// -------------------------------------------------------------
// LOCAL CACHING HELPERS
// -------------------------------------------------------------

function getCachedInvoices(workspaceId: string): InvoiceWithCustomer[] {
  try {
    const key = `tq_invoices_${workspaceId}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setCachedInvoices(workspaceId: string, invoices: InvoiceWithCustomer[]): void {
  try {
    localStorage.setItem(`tq_invoices_${workspaceId}`, JSON.stringify(invoices));
  } catch {}
}

function updateCachedInvoice(
  workspaceId: string,
  invoiceId: string,
  updates: Partial<InvoiceWithCustomer>
): void {
  try {
    const list = getCachedInvoices(workspaceId);
    const updated = list.map((inv) => (inv.id === invoiceId ? { ...inv, ...updates } : inv));
    setCachedInvoices(workspaceId, updated);
  } catch {}
}

function saveInvoiceLineItems(invoiceId: string, quoteId: string, items: QuoteLineItem[]): void {
  try {
    localStorage.setItem(`tq_inv_items_${invoiceId}`, JSON.stringify(items));
    if (quoteId) {
      localStorage.setItem(`tq_quote_to_inv_${quoteId}`, invoiceId);
    }
  } catch {}
}

export function getInvoiceLineItems(invoiceId: string, quoteId?: string | null): QuoteLineItem[] {
  try {
    const direct = localStorage.getItem(`tq_inv_items_${invoiceId}`);
    if (direct) return JSON.parse(direct);

    if (quoteId) {
      const byQuote = localStorage.getItem(`tq_quote_items_${quoteId}`);
      if (byQuote) return JSON.parse(byQuote);
    }
  } catch {}
  return [];
}
