-- AI Call Assistant Schema
-- Adds tables for phone calls, memories, subscriptions, and billing

-- Enable pgvector extension for semantic memory search
create extension if not exists vector;

-- Update profiles table with new fields
alter table profiles add column if not exists preferred_name text;
alter table profiles add column if not exists onboarding_completed boolean default false;

-- User phone registry (link user phone numbers to profiles)
create table if not exists user_phones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  phone_number text unique not null,
  is_verified boolean default false,
  is_primary boolean default false,
  created_at timestamptz default now() not null
);

-- Enable RLS for user_phones
alter table user_phones enable row level security;

create policy "Users can view own phones"
  on user_phones for select
  using (auth.uid() = user_id);

create policy "Users can insert own phones"
  on user_phones for insert
  with check (auth.uid() = user_id);

create policy "Users can update own phones"
  on user_phones for update
  using (auth.uid() = user_id);

create policy "Users can delete own phones"
  on user_phones for delete
  using (auth.uid() = user_id);

-- Calls table (call history and metadata)
create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  twilio_call_sid text unique not null,
  caller_phone text not null,
  direction text check (direction in ('inbound', 'outbound')) not null,
  status text check (status in ('initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled')) not null,
  duration_seconds integer default 0,
  cost_cents integer default 0,
  started_at timestamptz default now() not null,
  ended_at timestamptz,
  created_at timestamptz default now() not null
);

-- Enable RLS for calls
alter table calls enable row level security;

create policy "Users can view own calls"
  on calls for select
  using (auth.uid() = user_id);

-- Conversation messages (full transcript storage)
create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references calls(id) on delete cascade not null,
  role text check (role in ('user', 'assistant', 'system')) not null,
  content text not null,
  audio_url text,
  timestamp_ms integer not null,
  created_at timestamptz default now() not null
);

-- Enable RLS for conversation_messages
alter table conversation_messages enable row level security;

create policy "Users can view own messages"
  on conversation_messages for select
  using (call_id in (select id from calls where user_id = auth.uid()));

-- User memories (extracted facts with vector embeddings)
create table if not exists user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  call_id uuid references calls(id) on delete set null,
  content text not null,
  category text check (category in ('preference', 'fact', 'task', 'reminder', 'relationship', 'other')) not null,
  embedding vector(1536),
  importance_score decimal(3,2) default 0.50,
  is_active boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create index for vector similarity search
create index if not exists user_memories_embedding_idx
  on user_memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Enable RLS for user_memories
alter table user_memories enable row level security;

create policy "Users can view own memories"
  on user_memories for select
  using (auth.uid() = user_id);

create policy "Users can delete own memories"
  on user_memories for delete
  using (auth.uid() = user_id);

-- Scheduled calls
create table if not exists scheduled_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  phone_number text not null,
  scheduled_at timestamptz not null,
  purpose text,
  status text check (status in ('pending', 'processing', 'completed', 'failed', 'canceled')) default 'pending',
  call_id uuid references calls(id) on delete set null,
  created_at timestamptz default now() not null
);

-- Enable RLS for scheduled_calls
alter table scheduled_calls enable row level security;

create policy "Users can view own scheduled calls"
  on scheduled_calls for select
  using (auth.uid() = user_id);

create policy "Users can insert own scheduled calls"
  on scheduled_calls for insert
  with check (auth.uid() = user_id);

create policy "Users can update own scheduled calls"
  on scheduled_calls for update
  using (auth.uid() = user_id);

create policy "Users can delete own scheduled calls"
  on scheduled_calls for delete
  using (auth.uid() = user_id);

-- Subscriptions
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null unique,
  plan text check (plan in ('free', 'paid')) default 'free' not null,
  provider text check (provider in ('paddle', 'polar')) default 'paddle',
  provider_customer_id text,
  provider_subscription_id text,
  status text check (status in ('active', 'past_due', 'canceled', 'trialing')) default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS for subscriptions
alter table subscriptions enable row level security;

create policy "Users can view own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- User balance (credits tracking)
create table if not exists user_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null unique,
  balance_cents integer default 500 not null, -- $5 free tier
  total_spent_cents integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS for user_balances
alter table user_balances enable row level security;

create policy "Users can view own balance"
  on user_balances for select
  using (auth.uid() = user_id);

-- Balance transactions (audit log)
create table if not exists balance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  amount_cents integer not null, -- positive = credit, negative = debit
  type text check (type in ('initial_credit', 'subscription_credit', 'purchase', 'call_charge', 'refund', 'adjustment')) not null,
  description text,
  call_id uuid references calls(id) on delete set null,
  provider_payment_id text,
  created_at timestamptz default now() not null
);

-- Enable RLS for balance_transactions
alter table balance_transactions enable row level security;

create policy "Users can view own transactions"
  on balance_transactions for select
  using (auth.uid() = user_id);

-- Call sessions (active call state - Redis primary, DB backup)
create table if not exists call_sessions (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references calls(id) on delete cascade not null unique,
  user_id uuid references profiles(id) on delete set null,
  state text check (state in ('identifying', 'onboarding', 'active', 'ending')) not null,
  context jsonb default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create indexes for performance
create index if not exists calls_user_id_idx on calls(user_id);
create index if not exists calls_started_at_idx on calls(started_at desc);
create index if not exists conversation_messages_call_id_idx on conversation_messages(call_id);
create index if not exists user_memories_user_id_idx on user_memories(user_id);
create index if not exists user_memories_category_idx on user_memories(category);
create index if not exists scheduled_calls_user_id_idx on scheduled_calls(user_id);
create index if not exists scheduled_calls_scheduled_at_idx on scheduled_calls(scheduled_at);
create index if not exists balance_transactions_user_id_idx on balance_transactions(user_id);

-- Trigger to auto-update updated_at on user_memories
create trigger update_user_memories_updated_at
  before update on user_memories
  for each row execute procedure update_updated_at_column();

-- Trigger to auto-update updated_at on subscriptions
create trigger update_subscriptions_updated_at
  before update on subscriptions
  for each row execute procedure update_updated_at_column();

-- Trigger to auto-update updated_at on user_balances
create trigger update_user_balances_updated_at
  before update on user_balances
  for each row execute procedure update_updated_at_column();

-- Trigger to auto-update updated_at on call_sessions
create trigger update_call_sessions_updated_at
  before update on call_sessions
  for each row execute procedure update_updated_at_column();

-- Function to create balance record on new user
create or replace function handle_new_user_balance()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_balances (user_id, balance_cents)
  values (new.id, 500); -- $5 free tier

  insert into public.balance_transactions (user_id, amount_cents, type, description)
  values (new.id, 500, 'initial_credit', 'Welcome bonus - $5 free credit');

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active');

  return new;
end;
$$;

-- Trigger to create balance on profile creation
create trigger on_profile_created_create_balance
  after insert on profiles
  for each row execute procedure handle_new_user_balance();
