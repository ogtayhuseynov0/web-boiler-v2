-- Memoir Chapters System
-- Transforms bullet-point memories into narrative chapters

-- Memoir chapters table (dynamic chapter structure per user)
create table if not exists memoir_chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  slug text not null,
  description text,
  display_order integer not null default 0,
  time_period_start text, -- e.g., "1950", "1970s", "childhood"
  time_period_end text,   -- e.g., "1968", "1980s", "present"
  is_default boolean default false, -- true for auto-generated chapters
  memory_count integer default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  unique(user_id, slug)
);

-- Enable RLS for memoir_chapters
alter table memoir_chapters enable row level security;

create policy "Users can view own chapters"
  on memoir_chapters for select
  using (auth.uid() = user_id);

create policy "Users can manage own chapters"
  on memoir_chapters for all
  using (auth.uid() = user_id);

-- Chapter content table (versioned narrative storage)
create table if not exists chapter_content (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references memoir_chapters(id) on delete cascade not null,
  content text not null, -- The narrative prose
  version integer not null default 1,
  word_count integer default 0,
  memory_ids uuid[] default '{}', -- Memories used to generate this version
  is_current boolean default true,
  generated_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- Only one current version per chapter
create unique index chapter_content_current_idx
  on chapter_content(chapter_id)
  where is_current = true;

-- Enable RLS for chapter_content
alter table chapter_content enable row level security;

create policy "Users can view own chapter content"
  on chapter_content for select
  using (chapter_id in (select id from memoir_chapters where user_id = auth.uid()));

-- Add chapter reference to user_memories
alter table user_memories add column if not exists chapter_id uuid references memoir_chapters(id) on delete set null;
alter table user_memories add column if not exists time_period text; -- e.g., "1960s", "childhood", "2020"
alter table user_memories add column if not exists time_context text; -- additional time context from the memory

-- Create indexes
create index if not exists memoir_chapters_user_id_idx on memoir_chapters(user_id);
create index if not exists memoir_chapters_display_order_idx on memoir_chapters(user_id, display_order);
create index if not exists chapter_content_chapter_id_idx on chapter_content(chapter_id);
create index if not exists user_memories_chapter_id_idx on user_memories(chapter_id);
create index if not exists user_memories_time_period_idx on user_memories(time_period);

-- Trigger to auto-update updated_at on memoir_chapters
create trigger update_memoir_chapters_updated_at
  before update on memoir_chapters
  for each row execute procedure update_updated_at_column();

-- Function to update chapter memory count
create or replace function update_chapter_memory_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Update old chapter count if chapter changed
  if TG_OP = 'UPDATE' and OLD.chapter_id is distinct from NEW.chapter_id then
    if OLD.chapter_id is not null then
      update memoir_chapters
      set memory_count = (select count(*) from user_memories where chapter_id = OLD.chapter_id and is_active = true),
          updated_at = now()
      where id = OLD.chapter_id;
    end if;
  end if;

  -- Update new chapter count
  if NEW.chapter_id is not null then
    update memoir_chapters
    set memory_count = (select count(*) from user_memories where chapter_id = NEW.chapter_id and is_active = true),
        updated_at = now()
    where id = NEW.chapter_id;
  end if;

  return NEW;
end;
$$;

-- Trigger to maintain chapter memory counts
create trigger update_memory_chapter_count
  after insert or update of chapter_id, is_active on user_memories
  for each row execute procedure update_chapter_memory_count();

-- Function to get or create default chapters for a user
create or replace function get_or_create_default_chapters(p_user_id uuid)
returns table (
  id uuid,
  title text,
  slug text,
  display_order integer
)
language plpgsql
security definer set search_path = public
as $$
begin
  -- Create default chapters if none exist
  if not exists (select 1 from memoir_chapters where user_id = p_user_id) then
    insert into memoir_chapters (user_id, title, slug, description, display_order, is_default, time_period_start, time_period_end)
    values
      (p_user_id, 'Early Years', 'early-years', 'Childhood memories and early life experiences', 1, true, 'birth', 'childhood'),
      (p_user_id, 'Growing Up', 'growing-up', 'School years, friendships, and coming of age', 2, true, 'childhood', 'teens'),
      (p_user_id, 'Young Adult', 'young-adult', 'College, first jobs, and finding your path', 3, true, 'late-teens', 'twenties'),
      (p_user_id, 'Building a Life', 'building-a-life', 'Career, relationships, and major milestones', 4, true, 'twenties', 'present'),
      (p_user_id, 'Family & Loved Ones', 'family', 'Stories about the people who matter most', 5, true, null, null),
      (p_user_id, 'Reflections', 'reflections', 'Wisdom, lessons learned, and life philosophy', 6, true, null, null);
  end if;

  return query
  select mc.id, mc.title, mc.slug, mc.display_order
  from memoir_chapters mc
  where mc.user_id = p_user_id
  order by mc.display_order;
end;
$$;

-- Function to mark old chapter content as not current
create or replace function set_chapter_content_not_current()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- When inserting new current content, mark old as not current
  if NEW.is_current = true then
    update chapter_content
    set is_current = false
    where chapter_id = NEW.chapter_id
      and id != NEW.id
      and is_current = true;
  end if;
  return NEW;
end;
$$;

create trigger before_insert_chapter_content
  before insert on chapter_content
  for each row execute procedure set_chapter_content_not_current();
