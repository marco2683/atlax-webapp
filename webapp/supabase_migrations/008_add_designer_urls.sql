ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS online_portfolio_url text,
ADD COLUMN IF NOT EXISTS linkedin_url text;
