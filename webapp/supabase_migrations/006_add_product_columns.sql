-- Migration: Add missing product columns
-- pricing_tiers, packaging, and rich_description were being sent by the
-- supplier dashboard save handler but did not exist as columns on products.
-- The pricing_tiers table is separate (for display), but we also store
-- the supplier-entered tiers as JSONB on the product for quick access.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pricing_tiers  JSONB    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS packaging      JSONB    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rich_description TEXT   DEFAULT '';
