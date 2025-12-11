-- Add memoir sharing fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_memoir_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS memoir_share_slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS memoir_title TEXT,
ADD COLUMN IF NOT EXISTS memoir_description TEXT;

-- Create index for public memoir lookups
CREATE INDEX IF NOT EXISTS idx_profiles_memoir_public ON profiles(is_memoir_public) WHERE is_memoir_public = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_memoir_share_slug ON profiles(memoir_share_slug) WHERE memoir_share_slug IS NOT NULL;

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_memoir_slug(user_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug from name
  base_slug := LOWER(REGEXP_REPLACE(COALESCE(user_name, 'memoir'), '[^a-z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);

  -- If empty, use 'memoir'
  IF base_slug = '' THEN
    base_slug := 'memoir';
  END IF;

  final_slug := base_slug;

  -- Check for uniqueness and add number if needed
  WHILE EXISTS (SELECT 1 FROM profiles WHERE memoir_share_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;
