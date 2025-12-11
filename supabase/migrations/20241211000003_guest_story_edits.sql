-- Allow guest story edits with re-approval

-- Add memoir_story_id to track the linked chapter_story
ALTER TABLE guest_stories ADD COLUMN IF NOT EXISTS memoir_story_id UUID REFERENCES chapter_stories(id) ON DELETE SET NULL;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_guest_stories_memoir_story_id ON guest_stories(memoir_story_id);

-- Update the invite to allow multiple uses (edits) by default
-- Keep max_uses for limiting new submissions, but edits don't count against it
ALTER TABLE story_invites ALTER COLUMN max_uses SET DEFAULT 999;

-- Add a column to track if this is an edit vs new submission
ALTER TABLE guest_stories ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE guest_stories ADD COLUMN IF NOT EXISTS last_approved_at TIMESTAMPTZ;
