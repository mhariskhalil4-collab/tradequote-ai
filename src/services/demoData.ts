import type {
  Workspace,
  PriceBookItem,
  Customer,
  QuoteWithCustomer,
  QuoteLineItem,
  JobWithCustomer,
} from '../types/database';
import type { InvoiceWithCustomer } from '../utils/pdfGenerator';
import { SAMPLE_HVAC_ITEMS } from './priceBookService';

export const DEMO_WORKSPACE: Workspace = {
  id: 'demo-workspace-coolair',
  owner_id: 'demo-owner-id',
  business_name: 'CoolAir HVAC Services',
  trade_type: 'HVAC',
  phone: '(555) 321-7890',
  email: 'service@coolairhvac.com',
  logo_url: null,
  currency: 'USD',
  created_at: '2026-11-01T08:00:00Z',
};

// 1. Price Book: 8 sample HVAC items
export const DEMO_PRICE_BOOK: PriceBookItem[] = SAMPLE_HVAC_ITEMS.map((item, idx) => ({
  id: `demo-pbi-${idx + 1}`,
  workspace_id: DEMO_WORKSPACE.id,
  name: item.name,
  description: item.description,
  category: item.category,
  unit: item.unit,
  unit_price: item.unit_price,
  is_active: item.is_active,
  created_at: new Date(Date.now() - (10 - idx) * 86400000).toISOString(),
}));

// 2. 5 Customers
export const DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'demo-cust-1',
    workspace_id: DEMO_WORKSPACE.id,
    name: 'Robert Henderson',
    phone: '(555) 234-5678',
    email: 'robert.henderson@example.com',
    address: '742 Evergreen Terrace, Springfield',
    notes: 'Residential customer. Annual AC maintenance plan preferred.',
    created_at: '2026-11-02T10:00:00Z',
  },
  {
    id: 'demo-cust-2',
    workspace_id: DEMO_WORKSPACE.id,
    name: 'Oakridge Dental Clinic',
    phone: '(555) 876-5432',
    email: 'facilities@oakridgedental.com',
    address: '1200 Commercial Way, Suite 4B',
    notes: 'Commercial rooftop packaged unit. Requires weekend servicing.',
    created_at: '2026-11-03T11:30:00Z',
  },
  {
    id: 'demo-cust-3',
    workspace_id: DEMO_WORKSPACE.id,
    name: 'Marcus Vance',
    phone: '(555) 345-6789',
    email: 'marcus.vance@example.com',
    address: '88 Birchwood Drive, West End',
    notes: 'Inquired about multi-split AC installation for home renovation.',
    created_at: '2026-11-04T09:15:00Z',
  },
  {
    id: 'demo-cust-4',
    workspace_id: DEMO_WORKSPACE.id,
    name: 'Summit Fitness Club',
    phone: '(555) 432-1098',
    email: 'management@summitfitness.com',
    address: '450 Athletic Way, Downtown',
    notes: 'Commercial multi-zone facility. High airflow requirement for gym floor.',
    created_at: '2026-11-05T14:20:00Z',
  },
  {
    id: 'demo-cust-5',
    workspace_id: DEMO_WORKSPACE.id,
    name: 'Elena Rostova',
    phone: '(555) 654-3210',
    email: 'elena.rostova@example.com',
    address: '19 Maple Crescent, North Hills',
    notes: 'Residential customer. Split AC overhaul and compressor check.',
    created_at: '2026-11-06T16:45:00Z',
  },
];

// Helper customer lookup
const getCust = (id: string) => DEMO_CUSTOMERS.find((c) => c.id === id) || null;

// Share token for the public sent quote
export const DEMO_SHARE_TOKEN = 'demo-coolair-quote-sent';

// 3. 6 Quotes (2 draft, 1 sent, 2 accepted, 1 declined)
export const DEMO_QUOTES: QuoteWithCustomer[] = [
  // Quote 1: SENT (Has working public share link!)
  {
    id: 'demo-quote-1',
    workspace_id: DEMO_WORKSPACE.id,
    customer_id: 'demo-cust-2', // Oakridge Dental Clinic
    quote_number: 'TQ-1001',
    title: 'AC Gas Refill & Rooftop Maintenance',
    status: 'sent',
    subtotal: 165,
    tax_percent: 0,
    total: 165,
    notes: 'Commercial rooftop packaged unit servicing and R32 gas refill. 90-day parts and labour warranty.',
    share_token: DEMO_SHARE_TOKEN,
    expires_at: '2026-11-25T23:59:59.000Z',
    created_at: '2026-11-07T09:30:00Z',
    updated_at: '2026-11-07T09:30:00Z',
    customer: getCust('demo-cust-2'),
  },
  // Quote 2: DRAFT
  {
    id: 'demo-quote-2',
    workspace_id: DEMO_WORKSPACE.id,
    customer_id: 'demo-cust-1', // Robert Henderson
    quote_number: 'TQ-1002',
    title: 'Seasonal HVAC Tune-up & Drain Flush',
    status: 'draft',
    subtotal: 105,
    tax_percent: 0,
    total: 105,
    notes: 'Annual residential pre-summer checkup, coil cleaning, and high pressure drain line flush.',
    share_token: 'demo-token-quote-2',
    expires_at: null,
    created_at: '2026-11-08T10:15:00Z',
    updated_at: '2026-11-08T10:15:00Z',
    customer: getCust('demo-cust-1'),
  },
  // Quote 3: DRAFT
  {
    id: 'demo-quote-3',
    workspace_id: DEMO_WORKSPACE.id,
    customer_id: 'demo-cust-3', // Marcus Vance
    quote_number: 'TQ-1003',
    title: 'Smart Digital Thermostat Upgrade',
    status: 'draft',
    subtotal: 140,
    tax_percent: 0,
    total: 140,
    notes: 'Programmable multi-stage digital thermostat installation and 1 hour labor.',
    share_token: 'demo-token-quote-3',
    expires_at: null,
    created_at: '2026-11-09T11:00:00Z',
    updated_at: '2026-11-09T11:00:00Z',
    customer: getCust('demo-cust-3'),
  },
  // Quote 4: ACCEPTED (Has paid invoice)
  {
    id: 'demo-quote-4',
    workspace_id: DEMO_WORKSPACE.id,
    customer_id: 'demo-cust-4', // Summit Fitness Club
    quote_number: 'TQ-1004',
    title: 'Commercial Chiller Condensate Pump Replacement',
    status: 'accepted',
    subtotal: 350,
    tax_percent: 0,
    total: 350,
    notes: 'Removal of faulty condensate drain pump, supply of heavy-duty replacement, and 10ft copper pipe line.',
    share_token: 'demo-token-quote-4',
    expires_at: '2026-11-20T23:59:59.000Z',
    created_at: '2026-11-05T13:00:00Z',
    updated_at: '2026-11-06T14:30:00Z',
    customer: getCust('demo-cust-4'),
  },
  // Quote 5: ACCEPTED (Has unpaid invoice)
  {
    id: 'demo-quote-5',
    workspace_id: DEMO_WORKSPACE.id,
    customer_id: 'demo-cust-5', // Elena Rostova
    quote_number: 'TQ-1005',
    title: 'Compressor Diagnostic & R32 Refrigerant Charge',
    status: 'accepted',
    subtotal: 330,
    tax_percent: 0,
    total: 330,
    notes: '3 hours compressor diagnostic labor and complete R32 gas refill.',
    share_token: 'demo-token-quote-5',
    expires_at: '2026-11-22T23:59:59.000Z',
    created_at: '2026-11-06T15:20:00Z',
    updated_at: '2026-11-07T09:00:00Z',
    customer: getCust('demo-cust-5'),
  },
  // Quote 6: DECLINED
  {
    id: 'demo-quote-6',
    workspace_id: DEMO_WORKSPACE.id,
    customer_id: 'demo-cust-1', // Robert Henderson
    quote_number: 'TQ-1006',
    title: 'Multi-Zone Line Set Replacement & Overhaul',
    status: 'declined',
    subtotal: 515,
    tax_percent: 0,
    total: 515,
    notes: 'Full line set replacement with 25ft insulated copper piping, digital thermostat, and 4 hours compressor work.',
    share_token: 'demo-token-quote-6',
    expires_at: '2026-11-15T23:59:59.000Z',
    created_at: '2026-11-04T08:45:00Z',
    updated_at: '2026-11-05T17:00:00Z',
    customer: getCust('demo-cust-1'),
  },
];

// Line items for each quote
export const DEMO_QUOTE_LINE_ITEMS: Record<string, QuoteLineItem[]> = {
  'demo-quote-1': [
    {
      id: 'demo-li-1-1',
      quote_id: 'demo-quote-1',
      workspace_id: DEMO_WORKSPACE.id,
      price_book_item_id: 'demo-pbi-1',
      description: 'AC General Service',
      quantity: 1,
      unit: 'job',
      unit_price: 45,
      line_total: 45,
    },
    {
      id: 'demo-li-1-2',
      quote_id: 'demo-quote-1',
      workspace_id: DEMO_WORKSPACE.id,
      price_book_item_id: 'demo-pbi-2',
      description: 'AC Gas Refill R32',
      quantity: 1,
      unit: 'job',
      unit_price: 120,
      line_total: 120,
    },
  ],
  'demo-quote-2': [
    {
      id: 'demo-li-2-1',
      quote_id: 'demo-quote-2',
      workspace_id: DEMO_WORKSPACE.id,
      price_book_item_id: 'demo-pbi-1',
      description: 'AC General Service',
      quantity: 1,
      unit: 'job',
      unit_price: 45,
      line_total: 45,
    },
    {
      id: 'demo-li-2-2',
      quote_id: 'demo-quote-2',
      workspace_id: DEMO_WORKSPACE.id,
      price_book_item_id: 'demo-pbi-6',
      description: 'Drain Line Cleaning',
      quantity: 1,
      unit: 'job',
      unit_price: 60,
      line_total: 60,
    },
  ],
  'demo-quote-3': [
    {
      id: 'demo-li-3-1',
      quote_id: 'demo-quote-3',
      workspace_id: DEMO_WORKSPACE.id,
      price_book_item_id: 'demo-pbi-7',
      description: 'Thermostat (Digital)',
      quantity: 1,
      unit: 'each',
      unit_price: 85,
      line_total: 85,
    },
    {
      id: 'demo-li-3-2',
      quote_id: 'demo-quote-3',
      workspace_id: DEMO_WORKSPACE.id,
      price_book_item_id: 'demo-pbi-4',
      description: 'Pipe Fitting Labour',
      quantity: 1,
      unit: 'hour',
      unit_price: 55,
      line_total: 55,
    },
  ],
  'demo-quote-4': [
    {
      id: 'demo-li-4-1',
      quote_id: 'demo-quote-4',
      workspace_id: DEMO_WORKSPACE.id,
      price_book_item_id: 'demo-pbi-5',
      description: 'Water Pump Replacement',
      quantity: 1,
      unit: 'job',
      unit_price: 180,
      line_total: 180,
    },
    {
      id: 'demo-li-4-2',
      quote_id: 'demo-quote-4',
      workspace_id: DEMO_WORKSPACE.id,
      price_book_item_id: 'demo-pbi-4',
      description: 'Pipe Fitting Labour',
      quantity: 2,
      unit: 'hour',
      unit_price: 55,
      line_total: 110,
    },
    {
      id: 'demo-li-4-3',
      quote_id: 'demo-quote-4',
      workspace_id: DEMO_WORKSPACE.id,
      price_book_item_id: 'demo-pbi-3',
      description: 'Copper Pipe',
      quantity: 10,
      unit: 'foot',
      unit_price: 6,
      line_total: 60,
    },
  ],
  'demo-quote-5': [
    {
      id: 'demo-li-5-1',
      quote_id: 'demo-quote-5',
      workspace_id: DEMO_WORKSPACE.id,
      price_book_item_id: 'demo-pbi-8',
      description: 'Compressor Repair Labour',
      quantity: 3,
      unit: 'hour',
      unit_price: 70,
      line_total: 210,
    },
    {
      id: 'demo-li-5-2',
      quote_id: 'demo-quote-5',
      workspace_id: DEMO_WORKSPACE.id,
      price_book_item_id: 'demo-pbi-2',
      description: 'AC Gas Refill R32',
      quantity: 1,
      unit: 'job',
      unit_price: 120,
      line_total: 120,
    },
  ],
  'demo-quote-6': [
    {
      id: 'demo-li-6-1',
      quote_id: 'demo-quote-6',
      workspace_id: DEMO_WORKSPACE.id,
      price_book_item_id: 'demo-pbi-8',
      description: 'Compressor Repair Labour',
      quantity: 4,
      unit: 'hour',
      unit_price: 70,
      line_total: 280,
    },
    {
      id: 'demo-li-6-2',
      quote_id: 'demo-quote-6',
      workspace_id: DEMO_WORKSPACE.id,
      price_book_item_id: 'demo-pbi-7',
      description: 'Thermostat (Digital)',
      quantity: 1,
      unit: 'each',
      unit_price: 85,
      line_total: 85,
    },
    {
      id: 'demo-li-6-3',
      quote_id: 'demo-quote-6',
      workspace_id: DEMO_WORKSPACE.id,
      price_book_item_id: 'demo-pbi-3',
      description: 'Copper Pipe',
      quantity: 25,
      unit: 'foot',
      unit_price: 6,
      line_total: 150,
    },
  ],
};

// 4. Invoices (1 paid, 1 unpaid)
export const DEMO_INVOICES: InvoiceWithCustomer[] = [
  // Invoice 1: PAID (Summit Fitness Club, $350.00)
  {
    id: 'demo-inv-1',
    workspace_id: DEMO_WORKSPACE.id,
    quote_id: 'demo-quote-4',
    customer_id: 'demo-cust-4',
    invoice_number: 'INV-1001',
    amount: 350,
    status: 'paid',
    stripe_checkout_url: null,
    stripe_session_id: 'cs_test_demo_paid_1001',
    stripe_payment_id: 'pi_demo_paid_350_summit',
    due_date: '2026-11-13',
    paid_at: '2026-11-10T14:30:00Z',
    created_at: '2026-11-06T15:00:00Z',
    customer: getCust('demo-cust-4'),
    line_items: DEMO_QUOTE_LINE_ITEMS['demo-quote-4'],
  },
  // Invoice 2: UNPAID (Elena Rostova, $330.00)
  {
    id: 'demo-inv-2',
    workspace_id: DEMO_WORKSPACE.id,
    quote_id: 'demo-quote-5',
    customer_id: 'demo-cust-5',
    invoice_number: 'INV-1002',
    amount: 330,
    status: 'unpaid',
    stripe_checkout_url: 'https://checkout.stripe.com/c/pay/cs_test_demo_coolair_1002',
    stripe_session_id: 'cs_test_demo_unpaid_1002',
    stripe_payment_id: null,
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    paid_at: null,
    created_at: '2026-11-07T09:30:00Z',
    customer: getCust('demo-cust-5'),
    line_items: DEMO_QUOTE_LINE_ITEMS['demo-quote-5'],
  },
];

// Helper to calculate date relative to today
const getDateRel = (daysDiff: number, hour: number = 10): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysDiff);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

// 5. 4 Jobs (2 recurring AC services)
export const DEMO_JOBS: JobWithCustomer[] = [
  // Job 1: Recurring AC service (Due this week, e.g. tomorrow)
  {
    id: 'demo-job-1',
    workspace_id: DEMO_WORKSPACE.id,
    customer_id: 'demo-cust-2', // Oakridge Dental Clinic
    quote_id: 'demo-quote-1',
    title: 'Bi-Annual Rooftop AC Preventative Maintenance',
    scheduled_date: getDateRel(1, 9), // Due this week
    is_recurring: true,
    repeat_months: 6,
    status: 'scheduled',
    notes: 'Filter replacement, motor amp draw, refrigerant pressures check. Rooftop ladder access required.',
    created_at: '2026-11-07T10:00:00Z',
    customer: getCust('demo-cust-2'),
    quote: DEMO_QUOTES[0],
  },
  // Job 2: Recurring AC service (Due this week, e.g. in 3 days)
  {
    id: 'demo-job-2',
    workspace_id: DEMO_WORKSPACE.id,
    customer_id: 'demo-cust-4', // Summit Fitness Club
    quote_id: 'demo-quote-4',
    title: 'Quarterly HVAC Filter & Coil Inspection',
    scheduled_date: getDateRel(3, 11), // Due this week
    is_recurring: true,
    repeat_months: 3,
    status: 'scheduled',
    notes: 'Chemical coil wash, fan belt tension inspection, thermostat calibration across 4 workout zones.',
    created_at: '2026-11-06T11:00:00Z',
    customer: getCust('demo-cust-4'),
    quote: DEMO_QUOTES[3],
  },
  // Job 3: One-time job (Done, 3 days ago)
  {
    id: 'demo-job-3',
    workspace_id: DEMO_WORKSPACE.id,
    customer_id: 'demo-cust-5', // Elena Rostova
    quote_id: 'demo-quote-5',
    title: 'Emergency Condensate Drain Pump Replacement',
    scheduled_date: getDateRel(-3, 14),
    is_recurring: false,
    repeat_months: 0,
    status: 'done',
    notes: 'Faulty condensate pump removed and replaced. Float switch tested with water bucket. System operational.',
    created_at: '2026-11-06T16:00:00Z',
    customer: getCust('demo-cust-5'),
    quote: DEMO_QUOTES[4],
  },
  // Job 4: One-time job (Scheduled, next week)
  {
    id: 'demo-job-4',
    workspace_id: DEMO_WORKSPACE.id,
    customer_id: 'demo-cust-3', // Marcus Vance
    quote_id: 'demo-quote-3',
    title: 'System Diagnostics & Refrigerant Leak Check',
    scheduled_date: getDateRel(6, 13),
    is_recurring: false,
    repeat_months: 0,
    status: 'scheduled',
    notes: 'Electronic leak detector scan along accessible copper joints. Pressure test line sets.',
    created_at: '2026-11-09T14:00:00Z',
    customer: getCust('demo-cust-3'),
    quote: DEMO_QUOTES[2],
  },
];
