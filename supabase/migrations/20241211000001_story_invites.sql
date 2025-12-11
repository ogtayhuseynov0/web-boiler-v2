-- Story Invites - Allow users to invite friends/family to contribute stories

-- Story invites table
CREATE TABLE IF NOT EXISTS story_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  guest_email TEXT NOT NULL,
  guest_name TEXT,
  topic TEXT, -- Suggested topic for the story
  message TEXT, -- Optional personal message to the guest
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'completed', 'expired')),
  max_uses INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest stories table - stories submitted by guests
CREATE TABLE IF NOT EXISTS guest_stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_id UUID NOT NULL REFERENCES story_invites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Owner of the memoir
  guest_email TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  relationship TEXT, -- How the guest knows the user (e.g., "childhood friend", "sister")
  chapter_id UUID REFERENCES memoir_chapters(id) ON DELETE SET NULL, -- Can be assigned to chapter later
  is_approved BOOLEAN DEFAULT false, -- Owner must approve before it's added to memoir
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_story_invites_user_id ON story_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_story_invites_invite_code ON story_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_story_invites_guest_email ON story_invites(guest_email);
CREATE INDEX IF NOT EXISTS idx_story_invites_status ON story_invites(status);

CREATE INDEX IF NOT EXISTS idx_guest_stories_invite_id ON guest_stories(invite_id);
CREATE INDEX IF NOT EXISTS idx_guest_stories_user_id ON guest_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_stories_is_approved ON guest_stories(is_approved);

-- RLS policies for story_invites
ALTER TABLE story_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invites"
  ON story_invites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create invites"
  ON story_invites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invites"
  ON story_invites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invites"
  ON story_invites FOR DELETE
  USING (auth.uid() = user_id);

-- Public read access for invite lookup by code (guests need to view invite details)
CREATE POLICY "Anyone can view invite by code"
  ON story_invites FOR SELECT
  USING (true);

-- RLS policies for guest_stories
ALTER TABLE guest_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stories for their memoir"
  ON guest_stories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update stories for their memoir"
  ON guest_stories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete stories for their memoir"
  ON guest_stories FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can insert guest stories (guests submit via API)
CREATE POLICY "Service can insert guest stories"
  ON guest_stories FOR INSERT
  WITH CHECK (true);

-- Update triggers
CREATE TRIGGER update_story_invites_updated_at
  BEFORE UPDATE ON story_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_stories_updated_at
  BEFORE UPDATE ON guest_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
