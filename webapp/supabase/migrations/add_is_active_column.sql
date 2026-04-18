-- Add is_active column to component_categories to allow enabling/disabling marketplace categories
ALTER TABLE "public"."component_categories" 
ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
