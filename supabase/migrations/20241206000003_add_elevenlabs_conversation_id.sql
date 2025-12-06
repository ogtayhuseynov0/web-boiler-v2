-- Add ElevenLabs conversation ID to calls table
alter table calls
  add column if not exists elevenlabs_conversation_id text;

-- Create index for faster lookups
create index if not exists idx_calls_elevenlabs_conversation_id
  on calls(elevenlabs_conversation_id)
  where elevenlabs_conversation_id is not null;
