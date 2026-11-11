-- TradeQuote AI Database Schema (Phase 1)
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. WORKSPACES TABLE
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('HVAC', 'Plumbing')),
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. PRICE BOOK ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.price_book_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('part', 'labour', 'service')),
  unit TEXT NOT NULL CHECK (unit IN ('each', 'hour', 'foot', 'job')),
  unit_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. QUOTES TABLE
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_percent NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  share_token TEXT UNIQUE DEFAULT md5(random()::text || clock_timestamp()::text),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. QUOTE LINE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  price_book_item_id UUID REFERENCES public.price_book_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'each',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0
);

-- 7. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue')),
  stripe_checkout_url TEXT,
  stripe_session_id TEXT,
  stripe_payment_id TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. JOBS TABLE
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  repeat_months INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'done', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL 7 TABLES
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_book_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------------------

-- WORKSPACES POLICIES
-- A user can only select, insert and update a workspace where owner_id = auth.uid()
DROP POLICY IF EXISTS "Users can select own workspaces" ON public.workspaces;
CREATE POLICY "Users can select own workspaces"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own workspaces" ON public.workspaces;
CREATE POLICY "Users can insert own workspaces"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own workspaces" ON public.workspaces;
CREATE POLICY "Users can update own workspaces"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own workspaces" ON public.workspaces;
CREATE POLICY "Users can delete own workspaces"
  ON public.workspaces FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- PRICE BOOK ITEMS POLICIES
DROP POLICY IF EXISTS "Users can view workspace price book items" ON public.price_book_items;
CREATE POLICY "Users can view workspace price book items"
  ON public.price_book_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = price_book_items.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert workspace price book items" ON public.price_book_items;
CREATE POLICY "Users can insert workspace price book items"
  ON public.price_book_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = price_book_items.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update workspace price book items" ON public.price_book_items;
CREATE POLICY "Users can update workspace price book items"
  ON public.price_book_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = price_book_items.workspace_id
    AND workspaces.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = price_book_items.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete workspace price book items" ON public.price_book_items;
CREATE POLICY "Users can delete workspace price book items"
  ON public.price_book_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = price_book_items.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

-- CUSTOMERS POLICIES
DROP POLICY IF EXISTS "Users can view workspace customers" ON public.customers;
CREATE POLICY "Users can view workspace customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = customers.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert workspace customers" ON public.customers;
CREATE POLICY "Users can insert workspace customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = customers.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update workspace customers" ON public.customers;
CREATE POLICY "Users can update workspace customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = customers.workspace_id
    AND workspaces.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = customers.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete workspace customers" ON public.customers;
CREATE POLICY "Users can delete workspace customers"
  ON public.customers FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = customers.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

-- QUOTES POLICIES
DROP POLICY IF EXISTS "Users can view workspace quotes" ON public.quotes;
CREATE POLICY "Users can view workspace quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = quotes.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert workspace quotes" ON public.quotes;
CREATE POLICY "Users can insert workspace quotes"
  ON public.quotes FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = quotes.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update workspace quotes" ON public.quotes;
CREATE POLICY "Users can update workspace quotes"
  ON public.quotes FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = quotes.workspace_id
    AND workspaces.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = quotes.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete workspace quotes" ON public.quotes;
CREATE POLICY "Users can delete workspace quotes"
  ON public.quotes FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = quotes.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

-- QUOTE LINE ITEMS POLICIES
DROP POLICY IF EXISTS "Users can view workspace quote line items" ON public.quote_line_items;
CREATE POLICY "Users can view workspace quote line items"
  ON public.quote_line_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = quote_line_items.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert workspace quote line items" ON public.quote_line_items;
CREATE POLICY "Users can insert workspace quote line items"
  ON public.quote_line_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = quote_line_items.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update workspace quote line items" ON public.quote_line_items;
CREATE POLICY "Users can update workspace quote line items"
  ON public.quote_line_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = quote_line_items.workspace_id
    AND workspaces.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = quote_line_items.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete workspace quote line items" ON public.quote_line_items;
CREATE POLICY "Users can delete workspace quote line items"
  ON public.quote_line_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = quote_line_items.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

-- INVOICES POLICIES
DROP POLICY IF EXISTS "Users can view workspace invoices" ON public.invoices;
CREATE POLICY "Users can view workspace invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = invoices.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert workspace invoices" ON public.invoices;
CREATE POLICY "Users can insert workspace invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = invoices.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update workspace invoices" ON public.invoices;
CREATE POLICY "Users can update workspace invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = invoices.workspace_id
    AND workspaces.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = invoices.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete workspace invoices" ON public.invoices;
CREATE POLICY "Users can delete workspace invoices"
  ON public.invoices FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = invoices.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

-- JOBS POLICIES
DROP POLICY IF EXISTS "Users can view workspace jobs" ON public.jobs;
CREATE POLICY "Users can view workspace jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = jobs.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert workspace jobs" ON public.jobs;
CREATE POLICY "Users can insert workspace jobs"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = jobs.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update workspace jobs" ON public.jobs;
CREATE POLICY "Users can update workspace jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = jobs.workspace_id
    AND workspaces.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = jobs.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete workspace jobs" ON public.jobs;
CREATE POLICY "Users can delete workspace jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = jobs.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

