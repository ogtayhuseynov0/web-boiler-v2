-- Guest chat sessions and messages

-- Guest chat sessions table
CREATE TABLE IF NOT EXISTS guest_chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_id UUID NOT NULL REFERENCES story_invites(id) ON DELETE CASCADE,
  guest_email TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest chat messages table
CREATE TABLE IF NOT EXISTS guest_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES guest_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_chat_sessions_invite_id ON guest_chat_sessions(invite_id);
CREATE INDEX IF NOT EXISTS idx_guest_chat_sessions_guest_email ON guest_chat_sessions(guest_email);
CREATE INDEX IF NOT EXISTS idx_guest_chat_sessions_status ON guest_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_guest_chat_messages_session_id ON guest_chat_messages(session_id);

-- RLS policies
ALTER TABLE guest_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_chat_messages ENABLE ROW LEVEL SECURITY;

-- Service role can manage sessions (backend handles auth)
CREATE POLICY "Service can manage guest chat sessions"
  ON guest_chat_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can manage guest chat messages"
  ON guest_chat_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update trigger
CREATE TRIGGER update_guest_chat_sessions_updated_at
  BEFORE UPDATE ON guest_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
