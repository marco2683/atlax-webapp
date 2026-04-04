-- Migration for adding Expanded Profiles and Role Subscriptions

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS career_description TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS account_role TEXT DEFAULT 'seeker', 
ADD COLUMN IF NOT EXISTS role_tier TEXT DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS work_history TEXT,
ADD COLUMN IF NOT EXISTS experience_years INTEGER,
ADD COLUMN IF NOT EXISTS methodologies TEXT,
ADD COLUMN IF NOT EXISTS resume_url TEXT,
ADD COLUMN IF NOT EXISTS portfolio_assets JSONB;
