ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cover_letter_url text,
ADD COLUMN IF NOT EXISTS specialized_skills jsonb,
ADD COLUMN IF NOT EXISTS timezone text,
ADD COLUMN IF NOT EXISTS working_hours text,
ADD COLUMN IF NOT EXISTS working_days text,
ADD COLUMN IF NOT EXISTS schedule_type text;
