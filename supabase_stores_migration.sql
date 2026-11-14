-- ===============================================================
-- 🏪 SABAY LUK MULTI-TENANT SAAS MIGRATION SCRIPT FOR SUPABASE
-- ===============================================================
-- Copy and run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/bimrytgbvglhumkybjop/sql/new

-- 1. Create 'stores' table for multi-store registry
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  business_type TEXT DEFAULT 'retail',
  phone TEXT,
  telegram TEXT,
  address TEXT,
  owner_name TEXT,
  owner_username TEXT,
  pin TEXT,
  plan TEXT DEFAULT 'FREE', -- 'FREE' (15 products) | 'STARTER' (50 products, $1/mo) | 'BASIC' (100, $2/mo) | 'PRO' (250, $3/mo) | 'BUSINESS' (600, $5/mo) | 'ENTERPRISE' (unlimited, $10/mo)
  max_products INT DEFAULT 15,
  max_staff INT DEFAULT 1,
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE' | 'SUSPENDED' | 'EXPIRED'
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add 'store_id' column to existing tables for 100% data isolation
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS store_id TEXT;

-- 3. Create index for lightning-fast queries per store
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON public.categories(store_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);

-- 4. Insert Default Sabay Luk Flagship Store
INSERT INTO public.stores (id, slug, name, business_type, phone, owner_name, owner_username, pin, plan, max_products, max_staff, status)
VALUES (
  'store_default_sabayluk',
  'sabay-luk',
  'SABAY LUK (ហាងគំរូ)',
  'shoes_fashion',
  '0967205522',
  'វិចិត្រ (ម្ចាស់ហាង)',
  'admin',
  '1234',
  'ENTERPRISE',
  9999,
  10,
  'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Backfill existing products/orders to default store if store_id is null
UPDATE public.products SET store_id = 'store_default_sabayluk' WHERE store_id IS NULL;
UPDATE public.orders SET store_id = 'store_default_sabayluk' WHERE store_id IS NULL;
UPDATE public.categories SET store_id = 'store_default_sabayluk' WHERE store_id IS NULL;

-- 6. Enable Row Level Security (Public Read/Write for prototype or custom policy)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access to stores" ON public.stores FOR ALL USING (true) WITH CHECK (true);
