-- Add 'guest' as a valid source_type for chapter_stories

-- Drop the existing constraint
ALTER TABLE chapter_stories DROP CONSTRAINT IF EXISTS chapter_stories_source_type_check;

-- Add new constraint with 'guest' included
ALTER TABLE chapter_stories ADD CONSTRAINT chapter_stories_source_type_check
  CHECK (source_type IN ('chat', 'call', 'manual', 'guest'));
