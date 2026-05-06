-- Migration: Expand supplier profile for comprehensive onboarding
-- Adds company details, legal info, addresses, certifications, banking, and agreement data

-- Company details
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS trading_name TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS year_established INTEGER;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS employee_count TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country TEXT;

-- Certifications & licenses (JSONB array)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;
-- e.g. [{ "type": "ISO 9001", "file_url": "...", "expiry": "2027-01-01" }]

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS business_license_url TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS export_license_url TEXT;

-- Addresses (JSONB)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS registered_address JSONB DEFAULT '{}'::jsonb;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS factory_address JSONB DEFAULT '{}'::jsonb;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS warehouse_address JSONB DEFAULT '{}'::jsonb;
-- Each: { "line1": "", "line2": "", "city": "", "state": "", "postal_code": "", "country": "" }

-- Legal representatives & key contacts (JSONB array)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS legal_representatives JSONB DEFAULT '[]'::jsonb;
-- e.g. [{ "name": "", "title": "", "email": "", "phone": "", "is_primary": true }]

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS key_contacts JSONB DEFAULT '[]'::jsonb;

-- Banking / payout info
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS banking_info JSONB DEFAULT '{}'::jsonb;
-- { "bank_name": "", "account_name": "", "account_number": "", "swift_bic": "", "routing_number": "" }

-- Agreement
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS agreement_signed BOOLEAN DEFAULT false;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS agreement_signed_by TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS agreement_version TEXT DEFAULT 'v1.0';

-- Profile completion status
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS profile_completion_pct INTEGER DEFAULT 0;
