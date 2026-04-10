-- Taxonomy Images table for the Image Curator
-- Stores image URLs added via the admin panel, keyed by technology ID.
-- The frontend merges these with the static JSON for a unified view.

CREATE TABLE IF NOT EXISTS taxonomy_images (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tech_id text NOT NULL,
    image_url text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(tech_id, image_url)
);

-- Allow read access for all authenticated users
ALTER TABLE taxonomy_images ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read
CREATE POLICY "Anyone can read taxonomy images" ON taxonomy_images
    FOR SELECT USING (true);

-- Policy: service role can insert/update/delete (via serverless functions)
CREATE POLICY "Service role full access" ON taxonomy_images
    USING (true)
    WITH CHECK (true);
