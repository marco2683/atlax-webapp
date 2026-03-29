-- ============================================================
-- PRD Manufacturing Engine — Database Schema
-- Paste this entire file into Supabase SQL Editor and run
-- ============================================================

-- 1. PROFILES TABLE
-- Stores extended customer information linked to auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name       TEXT,
  last_name        TEXT,
  company          TEXT,
  job_title        TEXT,
  phone            TEXT,
  industry         TEXT,
  country          TEXT,
  avatar_url       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROW LEVEL SECURITY
-- Users can only access their own profile
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- 3. AUTO-CREATE PROFILE ON SIGNUP
-- Trigger: when a new user signs up, automatically create a profile row
-- pulling first_name, last_name, company from the signup metadata
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, company)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'company'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 4. UPDATED_AT AUTO-STAMP
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 5. SHORTLISTS TABLE (future-proof)
-- Stores saved supplier shortlists per user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shortlists (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL DEFAULT 'My Shortlist',
  supplier_ids JSONB DEFAULT '[]',
  meta         JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own shortlists"
  ON public.shortlists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_shortlists_updated_at ON public.shortlists;
CREATE TRIGGER set_shortlists_updated_at
  BEFORE UPDATE ON public.shortlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 6. RFQ HISTORY TABLE
-- Stores RFQ submissions per user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rfq_history (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rfq_data     JSONB NOT NULL DEFAULT '{}',
  status       TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'pending_supplier', 'quoted', 'cancelled', 'under_review')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rfq_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own RFQs"
  ON public.rfq_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_rfq_updated_at ON public.rfq_history;
CREATE TRIGGER set_rfq_updated_at
  BEFORE UPDATE ON public.rfq_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 7. USER FILES TABLE (File Vault)
-- Stores uploaded files (CAD drawings, specs, NDAs) per user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_files (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name    TEXT NOT NULL,
  file_type    TEXT,                        -- mime type or extension (e.g. 'step', 'pdf', 'stl')
  file_size    BIGINT DEFAULT 0,            -- bytes
  storage_path TEXT,                        -- Supabase Storage path
  category     TEXT DEFAULT 'general' CHECK (category IN ('cad', 'drawing', 'specification', 'nda', 'certificate', 'general')),
  linked_rfqs  JSONB DEFAULT '[]',          -- Array of rfq_history IDs this file is attached to
  meta         JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own files"
  ON public.user_files FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_user_files_updated_at ON public.user_files;
CREATE TRIGGER set_user_files_updated_at
  BEFORE UPDATE ON public.user_files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- DONE. Tables: profiles, shortlists, rfq_history, user_files
-- ============================================================
