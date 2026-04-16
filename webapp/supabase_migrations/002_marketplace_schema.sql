-- Migration for B2B Component Marketplace Schema

-- Enable UUID extension if not enabled natively, though gen_random_uuid() works natively in PG 13+
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Taxonomy: Component Categories
CREATE TABLE IF NOT EXISTS component_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES component_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Taxonomy: Category Parameters
CREATE TABLE IF NOT EXISTS category_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES component_categories(id) ON DELETE CASCADE, -- NULL means global parameter
    parameter_id TEXT, -- The machine-readable key (e.g. 'body_material')
    parameter_name TEXT NOT NULL, -- The display label
    data_type TEXT NOT NULL DEFAULT 'text', -- e.g., 'number', 'boolean', 'text', 'enum', 'multienum', 'range'
    unit TEXT,
    filter_ui TEXT, -- 'multi_select', 'min_max', 'toggle', 'range_slider', etc.
    supplier_required BOOLEAN DEFAULT false,
    facetable BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, parameter_id)
);

-- Force columns and nullability if the table already existed and IF NOT EXISTS skipped it:
ALTER TABLE category_parameters ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE category_parameters ADD COLUMN IF NOT EXISTS parameter_id TEXT;
ALTER TABLE category_parameters ADD COLUMN IF NOT EXISTS filter_ui TEXT;
ALTER TABLE category_parameters ADD COLUMN IF NOT EXISTS supplier_required BOOLEAN DEFAULT false;
ALTER TABLE category_parameters ADD COLUMN IF NOT EXISTS facetable BOOLEAN DEFAULT true;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'idx_unique_cat_param'
    ) THEN
        ALTER TABLE category_parameters ADD CONSTRAINT idx_unique_cat_param UNIQUE(category_id, parameter_id);
    END IF;
END $$;

-- Note: Map the existing suppliers table to auth users to enable supplier port login
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS manufacturer_name TEXT;

-- 3. Product Catalog
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES component_categories(id) ON DELETE RESTRICT,
    mpn TEXT NOT NULL,
    description TEXT,
    stock_quantity INTEGER DEFAULT 0,
    moq INTEGER DEFAULT 1,
    base_price NUMERIC,
    specs JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing JSONB to make parametric search blazingly fast
CREATE INDEX IF NOT EXISTS idx_products_specs ON products USING gin (specs);
-- Indexing MPN for text search speed
CREATE INDEX IF NOT EXISTS idx_products_mpn ON products (mpn);

-- 3.5 Product Attributes (EAV model for extensibility)
CREATE TABLE IF NOT EXISTS product_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute_key TEXT NOT NULL, -- references category_parameters.parameter_id
    value_raw TEXT NOT NULL,
    value_normalized NUMERIC, -- useful for range/min_max sorting
    unit TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Product Pricing Tiers
CREATE TABLE IF NOT EXISTS product_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    min_qty INTEGER NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Product Assets
CREATE TABLE IF NOT EXISTS product_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL, -- e.g., 'image', 'datasheet', 'cad'
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
