ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS old_price_tiers jsonb NOT NULL DEFAULT '[]'::jsonb;
