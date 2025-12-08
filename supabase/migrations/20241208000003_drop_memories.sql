-- Drop memories system (replaced by chapter_stories)

-- Drop the match_memories function first
DROP FUNCTION IF EXISTS match_memories(vector, uuid, float, int);

-- Drop the user_memories table
DROP TABLE IF EXISTS user_memories CASCADE;

-- Remove chapter_content table (no longer needed - stories are displayed directly)
DROP TABLE IF EXISTS chapter_content CASCADE;

-- Clean up memoir_chapters - remove memory_count if it exists
ALTER TABLE memoir_chapters DROP COLUMN IF EXISTS memory_count;
