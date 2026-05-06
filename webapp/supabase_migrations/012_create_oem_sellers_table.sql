-- Migration 012: Create dedicated oem_sellers table
-- Fully decouples marketplace sellers from the technology suppliers table.
-- NOTE: suppliers.id is TEXT, not UUID — oem_sellers.id must match.
-- NOTE: suppliers table does not have created_at, updated_at, or isActive columns.

CREATE TABLE IF NOT EXISTS oem_sellers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT, trading_name TEXT, segment TEXT DEFAULT 'OEM',
  registration_number TEXT, tax_id TEXT, industry TEXT,
  year_established INTEGER, employee_count TEXT, website TEXT,
  description TEXT, country TEXT,
  registered_address JSONB DEFAULT '{}', factory_address JSONB DEFAULT '{}',
  warehouse_address JSONB DEFAULT '{}', legal_representatives JSONB DEFAULT '[]',
  key_contacts JSONB DEFAULT '[]', banking_info JSONB DEFAULT '{}',
  certifications JSONB DEFAULT '[]', data JSONB DEFAULT '{}',
  onboarding_step INTEGER DEFAULT 0, onboarding_completed BOOLEAN DEFAULT false,
  agreement_signed BOOLEAN DEFAULT false, agreement_signed_by TEXT,
  agreement_signed_at TIMESTAMPTZ, agreement_version TEXT,
  profile_completion_pct INTEGER DEFAULT 0, owner_user_id UUID,
  "isActive" BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO oem_sellers (
  id, name, trading_name, segment, registration_number, tax_id,
  industry, year_established, employee_count, website, description, country,
  registered_address, factory_address, warehouse_address,
  legal_representatives, key_contacts, banking_info, certifications, data,
  onboarding_step, onboarding_completed, agreement_signed,
  agreement_signed_by, agreement_signed_at, agreement_version,
  profile_completion_pct, owner_user_id
)
SELECT
  id, name, trading_name, segment, registration_number, tax_id,
  industry, year_established, employee_count, website, description, country,
  COALESCE(registered_address, '{}'), COALESCE(factory_address, '{}'),
  COALESCE(warehouse_address, '{}'),
  COALESCE(legal_representatives, '[]'), COALESCE(key_contacts, '[]'),
  COALESCE(banking_info, '{}'), COALESCE(certifications, '[]'),
  COALESCE(data, '{}'),
  onboarding_step, onboarding_completed, agreement_signed,
  agreement_signed_by, agreement_signed_at, agreement_version,
  profile_completion_pct, owner_user_id
FROM suppliers WHERE type = 'marketplace';

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_supplier_id_fkey;
ALTER TABLE products ADD CONSTRAINT products_supplier_id_fkey
  FOREIGN KEY (supplier_id) REFERENCES oem_sellers(id) ON DELETE CASCADE;

ALTER TABLE supplier_team_members DROP CONSTRAINT IF EXISTS supplier_team_members_supplier_id_fkey;
ALTER TABLE supplier_team_members ADD CONSTRAINT supplier_team_members_supplier_id_fkey
  FOREIGN KEY (supplier_id) REFERENCES oem_sellers(id) ON DELETE CASCADE;

DELETE FROM suppliers WHERE type = 'marketplace';

ALTER TABLE oem_sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers can view own record" ON oem_sellers FOR SELECT USING (auth.uid() = owner_user_id);
CREATE POLICY "Sellers can update own record" ON oem_sellers FOR UPDATE USING (auth.uid() = owner_user_id);
CREATE POLICY "Sellers can insert own record" ON oem_sellers FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Public read for admin" ON oem_sellers FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_oem_sellers_owner ON oem_sellers(owner_user_id);
