export type TradeType = 'HVAC' | 'Plumbing';
export type ItemCategory = 'part' | 'labour' | 'service';
export type ItemUnit = 'each' | 'hour' | 'foot' | 'job';

export interface Workspace {
  id: string;
  owner_id: string;
  business_name: string;
  trade_type: TradeType;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  currency: string;
  created_at: string;
}

export interface PriceBookItem {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: ItemCategory;
  unit: ItemUnit;
  unit_price: number;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  workspace_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

export interface Quote {
  id: string;
  workspace_id: string;
  customer_id: string;
  quote_number: string;
  title: string;
  status: QuoteStatus;
  subtotal: number;
  tax_percent: number;
  total: number;
  notes: string | null;
  share_token: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteWithCustomer extends Quote {
  customer?: Customer | null;
  customers?: Customer | null;
  quote_line_items?: QuoteLineItem[];
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  workspace_id: string;
  price_book_item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
}

export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  workspace_id: string;
  quote_id: string | null;
  customer_id: string;
  invoice_number: string;
  amount: number;
  status: InvoiceStatus;
  stripe_checkout_url: string | null;
  stripe_session_id: string | null;
  stripe_payment_id: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

export type JobStatus = 'scheduled' | 'done' | 'cancelled';

export interface Job {
  id: string;
  workspace_id: string;
  customer_id: string;
  quote_id: string | null;
  title: string;
  scheduled_date: string | null;
  is_recurring: boolean;
  repeat_months: number;
  status: JobStatus;
  notes: string | null;
  created_at: string;
}

