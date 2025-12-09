-- Add content_hash column for duplicate detection
ALTER TABLE chapter_stories ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Create index for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_chapter_stories_content_hash
ON chapter_stories(user_id, content_hash)
WHERE content_hash IS NOT NULL;

-- Add story_focus_topics to profiles for Phase 4
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS story_focus_topics TEXT[] DEFAULT '{}';
