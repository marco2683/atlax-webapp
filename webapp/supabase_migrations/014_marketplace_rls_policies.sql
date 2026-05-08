-- Migration: Add RLS policies for supplier product management
-- Allows authenticated suppliers to insert/update/delete their own products
-- and allows all users to read products (for the marketplace catalog)

-- ═══ PRODUCTS TABLE ═══

-- Enable RLS (it may already be enabled if toggled in dashboard)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anon) to read all products (marketplace is public)
DROP POLICY IF EXISTS "products_select_all" ON products;
CREATE POLICY "products_select_all" ON products
  FOR SELECT USING (true);

-- Allow authenticated users to insert products for their own supplier record
DROP POLICY IF EXISTS "products_insert_own" ON products;
CREATE POLICY "products_insert_own" ON products
  FOR INSERT TO authenticated
  WITH CHECK (
    supplier_id IN (
      SELECT id FROM oem_sellers WHERE owner_user_id = auth.uid()
    )
  );

-- Allow authenticated users to update their own products
DROP POLICY IF EXISTS "products_update_own" ON products;
CREATE POLICY "products_update_own" ON products
  FOR UPDATE TO authenticated
  USING (
    supplier_id IN (
      SELECT id FROM oem_sellers WHERE owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    supplier_id IN (
      SELECT id FROM oem_sellers WHERE owner_user_id = auth.uid()
    )
  );

-- Allow authenticated users to delete their own products
DROP POLICY IF EXISTS "products_delete_own" ON products;
CREATE POLICY "products_delete_own" ON products
  FOR DELETE TO authenticated
  USING (
    supplier_id IN (
      SELECT id FROM oem_sellers WHERE owner_user_id = auth.uid()
    )
  );

-- ═══ CATEGORY_PARAMETERS TABLE ═══

-- Enable RLS
ALTER TABLE category_parameters ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read parameters
DROP POLICY IF EXISTS "category_parameters_select_all" ON category_parameters;
CREATE POLICY "category_parameters_select_all" ON category_parameters
  FOR SELECT USING (true);

-- Allow authenticated users to insert parameters (suppliers can add custom params)
DROP POLICY IF EXISTS "category_parameters_insert_auth" ON category_parameters;
CREATE POLICY "category_parameters_insert_auth" ON category_parameters
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update parameters
DROP POLICY IF EXISTS "category_parameters_update_auth" ON category_parameters;
CREATE POLICY "category_parameters_update_auth" ON category_parameters
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- ═══ PRODUCT_ASSETS TABLE ═══

ALTER TABLE product_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_assets_select_all" ON product_assets;
CREATE POLICY "product_assets_select_all" ON product_assets
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "product_assets_insert_own" ON product_assets;
CREATE POLICY "product_assets_insert_own" ON product_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    product_id IN (
      SELECT p.id FROM products p
      JOIN oem_sellers s ON p.supplier_id = s.id
      WHERE s.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "product_assets_update_own" ON product_assets;
CREATE POLICY "product_assets_update_own" ON product_assets
  FOR UPDATE TO authenticated
  USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN oem_sellers s ON p.supplier_id = s.id
      WHERE s.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "product_assets_delete_own" ON product_assets;
CREATE POLICY "product_assets_delete_own" ON product_assets
  FOR DELETE TO authenticated
  USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN oem_sellers s ON p.supplier_id = s.id
      WHERE s.owner_user_id = auth.uid()
    )
  );

-- ═══ COMPONENT_CATEGORIES TABLE ═══

ALTER TABLE component_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "component_categories_select_all" ON component_categories;
CREATE POLICY "component_categories_select_all" ON component_categories
  FOR SELECT USING (true);

-- Allow authenticated users to manage categories (suppliers may need to add)
DROP POLICY IF EXISTS "component_categories_insert_auth" ON component_categories;
CREATE POLICY "component_categories_insert_auth" ON component_categories
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "component_categories_update_auth" ON component_categories;
CREATE POLICY "component_categories_update_auth" ON component_categories
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
