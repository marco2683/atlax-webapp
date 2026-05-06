-- Migration 011: Add 'type' column to suppliers table
-- Separates technology suppliers (Supply Chain Discovery) from marketplace sellers (OEM)
-- Default: 'technology' — all existing rows remain in the technology pool

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'technology';

-- Auto-flag any self-registered marketplace sellers (they have an owner_user_id)
UPDATE suppliers SET type = 'marketplace' WHERE owner_user_id IS NOT NULL AND type = 'technology';

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON suppliers(type);
