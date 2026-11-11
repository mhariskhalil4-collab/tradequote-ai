// Supabase Edge Function: draft-quote
// Uses Gemini API to draft quote line items from plain-language job descriptions
// and matches them against the contractor's Price Book items.
//
// The GEMINI_API_KEY secret is read from Deno.env and is NEVER exposed to the browser.

interface PriceBookItemInput {
  id?: string;
  name: string;
  description?: string | null;
  category: string;
  unit: string;
  unit_price: number;
}

interface DraftRequest {
  description: string;
  priceBookItems?: PriceBookItemInput[];
  customerName?: string;
  tradeType?: string;
}

interface DraftedLineItem {
  price_book_item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
}

interface DraftResponse {
  title: string;
  notes: string;
  line_items: DraftedLineItem[];
  model?: string;
  source: 'gemini' | 'rules_fallback';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Deno HTTP server handler
Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
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
    const payload: DraftRequest = await req.json();
    const { description, priceBookItems = [], customerName = '', tradeType = 'HVAC' } = payload;

    if (!description || description.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Job description is required to draft a quote.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch Gemini API key from environment secrets (never exposed to browser)
    const geminiApiKey =
      Deno.env.get('GEMINI_API_KEY') ||
      Deno.env.get('VITE_GEMINI_API_KEY') ||
      '';

    let draftResult: DraftResponse | null = null;

    if (geminiApiKey) {
      try {
        draftResult = await callGeminiToDraftQuote(
          geminiApiKey,
          description,
          priceBookItems,
          customerName,
          tradeType
        );
      } catch (geminiError) {
        console.warn('Gemini API call encountered an error, falling back to rule matcher:', geminiError);
      }
    }

    // 3. Fallback matching if Gemini key is missing or call failed
    if (!draftResult) {
      draftResult = generateFallbackDraft(description, priceBookItems, tradeType);
    }

    return new Response(JSON.stringify(draftResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('Edge Function Error:', message);
    return new Response(
      JSON.stringify({ error: 'Internal server error processing quote draft', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function callGeminiToDraftQuote(
  apiKey: string,
  description: string,
  priceBookItems: PriceBookItemInput[],
  customerName: string,
  tradeType: string
): Promise<DraftResponse | null> {
  const prompt = `You are an expert trade estimating AI for ${tradeType} contractors.
A contractor received the following job description from a customer:
"${description}"
Customer Name: ${customerName || 'Residential Client'}

Here is the contractor's current Price Book catalog:
${JSON.stringify(
  priceBookItems.map((item) => ({
    id: item.id || '',
    name: item.name,
    category: item.category,
    unit: item.unit,
    unit_price: item.unit_price,
    description: item.description,
  })),
  null,
  2
)}

TASKS:
1. Break down the customer's job description into necessary trade line items (parts, labour, and services).
2. For each line item:
   - Match against an existing Price Book catalog item whenever relevant. If matched, use its exact "id" as "price_book_item_id", its exact name or clear description, its exact "unit", and its exact "unit_price".
   - If a necessary part/service/labour is NOT in the catalog, set "price_book_item_id" to null, and estimate a realistic trade description, unit ('each', 'hour', 'foot', 'job'), and reasonable "unit_price".
   - Estimate a reasonable positive "quantity" (e.g. 1 job, 2 hours, 10 feet).
   - Compute "line_total" = quantity * unit_price (rounded to 2 decimals).
3. Provide a concise, professional "title" for the quote (e.g., "AC Diagnostic, Drain Line Flush & R32 Recharge").
4. Provide a professional, customer-ready "notes" summarizing the scope of work and warranties.

Return ONLY a valid JSON object with the following schema:
{
  "title": "string",
  "notes": "string",
  "line_items": [
    {
      "price_book_item_id": "string or null",
      "description": "string",
      "quantity": 1,
      "unit": "string",
      "unit_price": 50,
      "line_total": 50
    }
  ]
}`;

  // Try gemini-1.5-flash endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Gemini HTTP error ${response.status}:`, errorBody);
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return null;

  try {
    const parsed = JSON.parse(rawText);
    const lineItems: DraftedLineItem[] = Array.isArray(parsed.line_items)
      ? parsed.line_items.map((item: any) => {
          const qty = Math.max(1, Number(item.quantity) || 1);
          const price = Number(item.unit_price) || 0;
          return {
            price_book_item_id: item.price_book_item_id || null,
            description: String(item.description || 'Service item'),
            quantity: qty,
            unit: String(item.unit || 'each'),
            unit_price: price,
            line_total: Math.round(qty * price * 100) / 100,
          };
        })
      : [];

    return {
      title: parsed.title || `${tradeType} Service & Repair`,
      notes: parsed.notes || 'Scope includes parts, labour, and manufacturer standard installation practices.',
      line_items: lineItems,
      model: 'gemini-1.5-flash',
      source: 'gemini',
    };
  } catch (parseErr) {
    console.error('Failed to parse Gemini JSON output:', parseErr, rawText);
    return null;
  }
}

// Fallback rule matcher in case Gemini API key is not configured or offline
function generateFallbackDraft(
  description: string,
  priceBookItems: PriceBookItemInput[],
  tradeType: string
): DraftResponse {
  const descLower = description.toLowerCase();
  const matchedLines: DraftedLineItem[] = [];

  // Keyword rules matching standard trade items
  priceBookItems.forEach((item) => {
    const nameLower = item.name.toLowerCase();
    const itemDescLower = (item.description || '').toLowerCase();

    let matches = false;
    let qty = 1;

    if (nameLower.includes('general service') && (descLower.includes('service') || descLower.includes('maintenance') || descLower.includes('check') || descLower.includes('tune'))) {
      matches = true;
    } else if (nameLower.includes('gas refill') && (descLower.includes('gas') || descLower.includes('refrigerant') || descLower.includes('r32') || descLower.includes('freon') || descLower.includes('cool') || descLower.includes('leak'))) {
      matches = true;
    } else if (nameLower.includes('drain line') && (descLower.includes('drain') || descLower.includes('water') || descLower.includes('clog') || descLower.includes('leak') || descLower.includes('flush'))) {
      matches = true;
    } else if (nameLower.includes('pump') && (descLower.includes('pump') || descLower.includes('condensate') || descLower.includes('overflow'))) {
      matches = true;
    } else if (nameLower.includes('thermostat') && (descLower.includes('thermostat') || descLower.includes('temperature') || descLower.includes('digital') || descLower.includes('control'))) {
      matches = true;
    } else if (nameLower.includes('pipe fitting labour') && (descLower.includes('pipe') || descLower.includes('copper') || descLower.includes('braz') || descLower.includes('fitting') || descLower.includes('labour') || descLower.includes('labor'))) {
      matches = true;
      qty = 2; // 2 hours
    } else if (nameLower.includes('copper pipe') && (descLower.includes('pipe') || descLower.includes('copper') || descLower.includes('tubing') || descLower.includes('feet') || descLower.includes('ft'))) {
      matches = true;
      qty = 15; // 15 feet
    } else if (nameLower.includes('compressor') && (descLower.includes('compressor') || descLower.includes('motor') || descLower.includes('noise') || descLower.includes('start'))) {
      matches = true;
      qty = 2;
    } else if (descLower.includes(nameLower)) {
      matches = true;
    }

    if (matches && !matchedLines.some((l) => l.price_book_item_id === item.id)) {
      matchedLines.push({
        price_book_item_id: item.id || null,
        description: item.name,
        quantity: qty,
        unit: item.unit,
        unit_price: item.unit_price,
        line_total: Math.round(qty * item.unit_price * 100) / 100,
      });
    }
  });

  // If no specific price book items matched, pick the first 2-3 standard items from the catalog
  if (matchedLines.length === 0 && priceBookItems.length > 0) {
    const serviceItem = priceBookItems.find((i) => i.category === 'service') || priceBookItems[0];
    const labourItem = priceBookItems.find((i) => i.category === 'labour');
    const partItem = priceBookItems.find((i) => i.category === 'part');

    if (serviceItem) {
      matchedLines.push({
        price_book_item_id: serviceItem.id || null,
        description: serviceItem.name,
        quantity: 1,
        unit: serviceItem.unit,
        unit_price: serviceItem.unit_price,
        line_total: serviceItem.unit_price,
      });
    }

    if (labourItem && !matchedLines.some((l) => l.price_book_item_id === labourItem.id)) {
      matchedLines.push({
        price_book_item_id: labourItem.id || null,
        description: labourItem.name,
        quantity: 2,
        unit: labourItem.unit,
        unit_price: labourItem.unit_price,
        line_total: labourItem.unit_price * 2,
      });
    }

    if (partItem && !matchedLines.some((l) => l.price_book_item_id === partItem.id)) {
      matchedLines.push({
        price_book_item_id: partItem.id || null,
        description: partItem.name,
        quantity: 1,
        unit: partItem.unit,
        unit_price: partItem.unit_price,
        line_total: partItem.unit_price,
      });
    }
  }

  // If still completely empty (no price book items passed)
  if (matchedLines.length === 0) {
    matchedLines.push({
      price_book_item_id: null,
      description: `${tradeType} Diagnostic & Service Assessment`,
      quantity: 1,
      unit: 'job',
      unit_price: 95,
      line_total: 95,
    });
  }

  return {
    title: `${tradeType} Service: ${description.slice(0, 40).trim()}${description.length > 40 ? '...' : ''}`,
    notes: `Scope prepared based on customer request: "${description.trim()}". Includes standard manufacturer warranty on parts and labour.`,
    line_items: matchedLines,
    source: 'rules_fallback',
  };
}

