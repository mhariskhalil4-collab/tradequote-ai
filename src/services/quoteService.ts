import { supabase } from '../lib/supabase';
import type {
  Quote,
  QuoteLineItem,
  QuoteWithCustomer,
  QuoteStatus,
  PriceBookItem,
} from '../types/database';

export interface DraftLineItemInput {
  price_book_item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
}

export interface AIDraftResult {
  title: string;
  notes: string;
  line_items: DraftLineItemInput[];
  source: 'gemini' | 'rules_fallback';
}

export async function fetchQuotes(
  workspaceId: string
): Promise<{ data: QuoteWithCustomer[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, customers(id, name, phone, email, address)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    const formatted: QuoteWithCustomer[] = (data || []).map((q: any) => ({
      ...q,
      customer: q.customers || null,
    }));

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch quotes.';
    return { data: null, error: msg };
  }
}

export async function fetchQuoteDetails(
  quoteId: string,
  workspaceId: string
): Promise<{
  quote: QuoteWithCustomer | null;
  items: QuoteLineItem[];
  error: string | null;
}> {
  try {
    const { data: quoteData, error: quoteError } = await supabase
      .from('quotes')
      .select('*, customers(id, name, phone, email, address)')
      .eq('id', quoteId)
      .eq('workspace_id', workspaceId)
      .single();

    if (quoteError) {
      return { quote: null, items: [], error: quoteError.message };
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quoteId)
      .eq('workspace_id', workspaceId)
      .order('id', { ascending: true });

    if (itemsError) {
      return {
        quote: { ...quoteData, customer: (quoteData as any)?.customers || null },
        items: [],
        error: itemsError.message,
      };
    }

    return {
      quote: { ...quoteData, customer: (quoteData as any)?.customers || null },
      items: (itemsData as QuoteLineItem[]) || [],
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch quote details.';
    return { quote: null, items: [], error: msg };
  }
}

export async function getNextQuoteNumber(workspaceId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select('quote_number')
      .eq('workspace_id', workspaceId);

    if (error || !data || data.length === 0) {
      return 'TQ-1001';
    }

    let highestNum = 1000;
    data.forEach((row: { quote_number: string }) => {
      const match = row.quote_number.match(/TQ-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > highestNum) {
          highestNum = num;
        }
      }
    });

    return `TQ-${highestNum + 1}`;
  } catch {
    return 'TQ-1001';
  }
}

export async function createQuoteWithLines(params: {
  workspaceId: string;
  customerId: string;
  title: string;
  notes?: string;
  quoteNumber?: string;
  taxPercent?: number;
  lineItems: DraftLineItemInput[];
}): Promise<{ data: Quote | null; error: string | null }> {
  try {
    const {
      workspaceId,
      customerId,
      title,
      notes = '',
      taxPercent = 0,
      lineItems,
    } = params;

    if (!customerId) {
      return { data: null, error: 'Please select a customer for this quote.' };
    }

    if (!lineItems || lineItems.length === 0) {
      return { data: null, error: 'Quote must include at least one line item.' };
    }

    // Determine quote number (e.g. TQ-1001)
    const quoteNumber = params.quoteNumber || (await getNextQuoteNumber(workspaceId));

    // Calculate financials
    const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.line_total) || 0), 0);
    const taxAmount = (subtotal * taxPercent) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    // 1. Insert Quote row
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day quote validity

    const { data: createdQuote, error: quoteInsertError } = await supabase
      .from('quotes')
      .insert([
        {
          workspace_id: workspaceId,
          customer_id: customerId,
          quote_number: quoteNumber,
          title: title.trim() || 'HVAC Service Quote',
          status: 'draft',
          subtotal: Math.round(subtotal * 100) / 100,
          tax_percent: taxPercent,
          total: total,
          notes: notes.trim() || null,
          expires_at: expiresAt.toISOString(),
        },
      ])
      .select()
      .single();

    if (quoteInsertError || !createdQuote) {
      return { data: null, error: quoteInsertError?.message || 'Failed to insert quote.' };
    }

    // 2. Insert line items
    const rowsToInsert = lineItems.map((item) => ({
      quote_id: createdQuote.id,
      workspace_id: workspaceId,
      price_book_item_id: item.price_book_item_id || null,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      line_total: item.line_total,
    }));

    const { error: linesInsertError } = await supabase
      .from('quote_line_items')
      .insert(rowsToInsert);

    if (linesInsertError) {
      console.error('Error inserting line items:', linesInsertError);
      return {
        data: createdQuote as Quote,
        error: `Quote created, but failed to save line items: ${linesInsertError.message}`,
      };
    }

    return { data: createdQuote as Quote, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create quote.';
    return { data: null, error: msg };
  }
}

export async function updateQuoteStatus(
  quoteId: string,
  workspaceId: string,
  status: QuoteStatus
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('quotes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', quoteId)
      .eq('workspace_id', workspaceId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update quote status.';
    return { error: msg };
  }
}

export async function deleteQuote(
  quoteId: string,
  workspaceId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', quoteId)
      .eq('workspace_id', workspaceId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete quote.';
    return { error: msg };
  }
}

/**
 * Drafts quote line items with AI using the Supabase Edge Function 'draft-quote'.
 * The Gemini API key is securely stored ONLY in the Edge Function runtime, NEVER in the browser.
 * If the Edge Function is not yet deployed on remote Supabase or fails, a resilient client-side
 * catalog matcher provides instant drafts so contractor workflows are never interrupted.
 */
export async function draftQuoteWithAI(params: {
  description: string;
  priceBookItems: PriceBookItem[];
  tradeType?: string;
  customerName?: string;
}): Promise<AIDraftResult> {
  const { description, priceBookItems, tradeType = 'HVAC', customerName = '' } = params;

  // 1. Call the Supabase Edge Function 'draft-quote'
  try {
    const { data, error } = await supabase.functions.invoke('draft-quote', {
      body: {
        description,
        priceBookItems,
        tradeType,
        customerName,
      },
    });

    if (!error && data && Array.isArray(data.line_items) && data.line_items.length > 0) {
      return {
        title: data.title || `${tradeType} Service & Estimate`,
        notes: data.notes || '',
        line_items: data.line_items.map((item: any) => ({
          price_book_item_id: item.price_book_item_id || null,
          description: String(item.description || 'Service Item'),
          quantity: Number(item.quantity) || 1,
          unit: String(item.unit || 'each'),
          unit_price: Number(item.unit_price) || 0,
          line_total:
            Number(item.line_total) ||
            Math.round((Number(item.quantity) || 1) * (Number(item.unit_price) || 0) * 100) / 100,
        })),
        source: data.source || 'gemini',
      };
    } else if (error) {
      console.info('Edge function draft-quote invocation returned error (falling back to intelligent matcher):', error.message);
    }
  } catch (invokeErr) {
    console.warn('Edge function draft-quote unreachable (falling back to intelligent matcher):', invokeErr);
  }

  // 2. Intelligent local fallback matching (NO Gemini API key in browser)
  return fallbackClientMatcher(description, priceBookItems, tradeType);
}

function fallbackClientMatcher(
  description: string,
  priceBookItems: PriceBookItem[],
  tradeType: string
): AIDraftResult {
  const descLower = description.toLowerCase();
  const matchedLines: DraftLineItemInput[] = [];

  priceBookItems.forEach((item) => {
    const nameLower = item.name.toLowerCase();
    let matches = false;
    let qty = 1;

    if (
      nameLower.includes('general service') &&
      (descLower.includes('service') ||
        descLower.includes('maintenance') ||
        descLower.includes('check') ||
        descLower.includes('tune') ||
        descLower.includes('ac'))
    ) {
      matches = true;
    } else if (
      nameLower.includes('gas refill') &&
      (descLower.includes('gas') ||
        descLower.includes('refill') ||
        descLower.includes('r32') ||
        descLower.includes('refrigerant') ||
        descLower.includes('cool') ||
        descLower.includes('freon'))
    ) {
      matches = true;
    } else if (
      nameLower.includes('drain line') &&
      (descLower.includes('drain') ||
        descLower.includes('clog') ||
        descLower.includes('water') ||
        descLower.includes('leak') ||
        descLower.includes('flush') ||
        descLower.includes('clean'))
    ) {
      matches = true;
    } else if (
      nameLower.includes('thermostat') &&
      (descLower.includes('thermostat') ||
        descLower.includes('temp') ||
        descLower.includes('digital') ||
        descLower.includes('control'))
    ) {
      matches = true;
    } else if (
      nameLower.includes('pump') &&
      (descLower.includes('pump') ||
        descLower.includes('condensate') ||
        descLower.includes('overflow'))
    ) {
      matches = true;
    } else if (
      nameLower.includes('copper pipe') &&
      (descLower.includes('pipe') ||
        descLower.includes('copper') ||
        descLower.includes('tubing') ||
        descLower.includes('ft') ||
        descLower.includes('feet'))
    ) {
      matches = true;
      qty = 10;
    } else if (
      nameLower.includes('pipe fitting labour') &&
      (descLower.includes('pipe') ||
        descLower.includes('fitting') ||
        descLower.includes('braz') ||
        descLower.includes('labour') ||
        descLower.includes('labor') ||
        descLower.includes('install'))
    ) {
      matches = true;
      qty = 2;
    } else if (
      nameLower.includes('compressor') &&
      (descLower.includes('compressor') ||
        descLower.includes('motor') ||
        descLower.includes('buzz') ||
        descLower.includes('noise'))
    ) {
      matches = true;
      qty = 2;
    } else if (descLower.includes(nameLower)) {
      matches = true;
    }

    if (matches && !matchedLines.some((l) => l.price_book_item_id === item.id)) {
      const lineTotal = Math.round(qty * item.unit_price * 100) / 100;
      matchedLines.push({
        price_book_item_id: item.id,
        description: item.name,
        quantity: qty,
        unit: item.unit,
        unit_price: item.unit_price,
        line_total: lineTotal,
      });
    }
  });

  // Default to standard package if nothing matched specifically
  if (matchedLines.length === 0 && priceBookItems.length > 0) {
    const service = priceBookItems.find((i) => i.category === 'service') || priceBookItems[0];
    const labour = priceBookItems.find((i) => i.category === 'labour');

    if (service) {
      matchedLines.push({
        price_book_item_id: service.id,
        description: service.name,
        quantity: 1,
        unit: service.unit,
        unit_price: service.unit_price,
        line_total: service.unit_price,
      });
    }

    if (labour && !matchedLines.some((l) => l.price_book_item_id === labour.id)) {
      matchedLines.push({
        price_book_item_id: labour.id,
        description: labour.name,
        quantity: 1.5,
        unit: labour.unit,
        unit_price: labour.unit_price,
        line_total: Math.round(1.5 * labour.unit_price * 100) / 100,
      });
    }
  }

  // Generate title and notes from plain words
  const cleanSnippet = description.length > 45 ? `${description.slice(0, 45).trim()}...` : description.trim();
  const title = `${tradeType} Work: ${cleanSnippet || 'System Service'}`;
  const notes = `Estimate prepared for: "${description.trim()}". All labour and parts conform to standard trade practices and include 90-day service warranty.`;

  return {
    title,
    notes,
    line_items: matchedLines,
    source: 'rules_fallback',
  };
}

/**
 * Generates a unique share token, sets expires_at to 7 days from now,
 * and marks the quote status as 'sent'.
 */
export async function shareQuote(
  quoteId: string,
  workspaceId: string
): Promise<{ data: Quote | null; shareUrl: string; shareToken: string; error: string | null }> {
  try {
    const shareToken =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Exactly 7 days from now

    const { data, error } = await supabase
      .from('quotes')
      .update({
        share_token: shareToken,
        expires_at: expiresAt.toISOString(),
        status: 'sent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) return { data: null, shareUrl: '', shareToken: '', error: error.message };

    const shareUrl = `${window.location.origin}/q/${shareToken}`;
    return { data: data as Quote, shareUrl, shareToken, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate share link.';
    return { data: null, shareUrl: '', shareToken: '', error: msg };
  }
}

export interface PublicQuoteData {
  id: string;
  quote_number: string;
  title: string;
  status: QuoteStatus;
  subtotal: number;
  tax_percent: number;
  total: number;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
  is_expired: boolean;
  customer: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
  workspace: {
    business_name: string;
    trade_type: string;
    phone?: string | null;
    email?: string | null;
    currency?: string;
  } | null;
  line_items: QuoteLineItem[];
}

/**
 * Loads quote details for a customer via share_token through the Supabase Edge Function 'public-quote'.
 * No login is required.
 */
export async function fetchPublicQuote(
  token: string
): Promise<{ data: PublicQuoteData | null; error: string | null }> {
  try {
    // 1. Invoke Supabase Edge Function 'public-quote'
    try {
      const { data, error } = await supabase.functions.invoke('public-quote', {
        body: { token: token.trim() },
      });

      if (!error && data && data.quote_number) {
        return { data: data as PublicQuoteData, error: null };
      }
    } catch (edgeErr) {
      console.info('Edge function public-quote invocation fallback:', edgeErr);
    }

    // 2. Resilient direct query fallback
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*, customers(name, phone, email, address), workspaces(business_name, trade_type, phone, email, currency)')
      .eq('share_token', token.trim())
      .single();

    if (quoteError || !quote) {
      return { data: null, error: quoteError?.message || 'Quote not found.' };
    }

    const { data: lineItems } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quote.id)
      .order('id', { ascending: true });

    const isExpired = quote.expires_at ? new Date(quote.expires_at) < new Date() : false;

    const formatted: PublicQuoteData = {
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
      customer: (quote as any).customers || null,
      workspace: (quote as any).workspaces || null,
      line_items: (lineItems as QuoteLineItem[]) || [],
    };

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch public quote.';
    return { data: null, error: msg };
  }
}

/**
 * Processes customer Accept or Decline on a public quote.
 */
export async function respondToPublicQuote(
  token: string,
  action: 'accept' | 'decline'
): Promise<{ success: boolean; status: QuoteStatus; error: string | null }> {
  const targetStatus: QuoteStatus = action === 'accept' ? 'accepted' : 'declined';
  try {
    // 1. Invoke Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('public-quote', {
        body: { token: token.trim(), action },
      });

      if (!error && data?.success) {
        return { success: true, status: (data.status as QuoteStatus) || targetStatus, error: null };
      }
    } catch (edgeErr) {
      console.info('Edge function response fallback:', edgeErr);
    }

    // 2. Direct query fallback
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('share_token', token.trim());

    if (updateError) {
      return { success: false, status: targetStatus, error: updateError.message };
    }

    return { success: true, status: targetStatus, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `Failed to ${action} quote.`;
    return { success: false, status: targetStatus, error: msg };
  }
}


