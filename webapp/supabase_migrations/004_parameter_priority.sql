-- Migration: Add 'priority' column to category_parameters
-- Values: 'required', 'recommended', 'optional'
-- Default: 'optional'

ALTER TABLE category_parameters 
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'optional';

-- Add image_url column to products (if missing)
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN category_parameters.priority IS 'Field priority: required | recommended | optional';
