-- Chapter Stories table - stores individual stories within chapters
CREATE TABLE IF NOT EXISTS chapter_stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES memoir_chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  time_period TEXT,
  source_type TEXT DEFAULT 'chat' CHECK (source_type IN ('chat', 'call', 'manual')),
  source_id TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chapter_stories_chapter_id ON chapter_stories(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_stories_user_id ON chapter_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_chapter_stories_created_at ON chapter_stories(created_at DESC);

-- RLS policies
ALTER TABLE chapter_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stories"
  ON chapter_stories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stories"
  ON chapter_stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories"
  ON chapter_stories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories"
  ON chapter_stories FOR DELETE
  USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE TRIGGER update_chapter_stories_updated_at
  BEFORE UPDATE ON chapter_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get story count per chapter
CREATE OR REPLACE FUNCTION get_chapter_story_count(chapter_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM chapter_stories
  WHERE chapter_id = chapter_uuid AND is_active = true;
$$ LANGUAGE SQL STABLE;

-- Update memoir_chapters to use story_count instead of memory_count
ALTER TABLE memoir_chapters DROP COLUMN IF EXISTS memory_count;
ALTER TABLE memoir_chapters ADD COLUMN IF NOT EXISTS story_count INTEGER DEFAULT 0;

-- Function to update story count on chapter
CREATE OR REPLACE FUNCTION update_chapter_story_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE memoir_chapters
    SET story_count = (
      SELECT COUNT(*) FROM chapter_stories
      WHERE chapter_id = NEW.chapter_id AND is_active = true
    )
    WHERE id = NEW.chapter_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE memoir_chapters
    SET story_count = (
      SELECT COUNT(*) FROM chapter_stories
      WHERE chapter_id = OLD.chapter_id AND is_active = true
    )
    WHERE id = OLD.chapter_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update story count
DROP TRIGGER IF EXISTS trigger_update_chapter_story_count ON chapter_stories;
CREATE TRIGGER trigger_update_chapter_story_count
  AFTER INSERT OR UPDATE OR DELETE ON chapter_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_chapter_story_count();
