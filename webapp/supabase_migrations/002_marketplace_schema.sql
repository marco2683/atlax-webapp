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
    category_id UUID NOT NULL REFERENCES component_categories(id) ON DELETE CASCADE,
    parameter_name TEXT NOT NULL,
    data_type TEXT NOT NULL DEFAULT 'text', -- e.g., 'number', 'boolean', 'text'
    unit TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
