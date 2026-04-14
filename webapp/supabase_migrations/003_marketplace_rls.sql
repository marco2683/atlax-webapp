-- Disable RLS (Row Level Security) on Marketplace Tables 
-- This allows the Admin panel (which connects anonymously via supabase-js in dev) to insert/edit categories.

ALTER TABLE component_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE category_parameters DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_pricing_tiers DISABLE ROW LEVEL SECURITY;

-- If you prefer using RLS, alternative is to create explicit open policies:
-- CREATE POLICY "Allow all actions for anon" ON component_categories FOR ALL TO anon USING (true) WITH CHECK (true);
