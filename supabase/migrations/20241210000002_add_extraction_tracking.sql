-- Add column to track last story extraction message count
-- This prevents duplicate extraction while allowing incremental extraction for new messages

alter table calls add column if not exists last_extracted_message_count integer default 0;
