-- Fix handle_new_user function for Google OAuth
-- The previous version expected phone which Google OAuth doesn't provide
-- Also add ON CONFLICT handling for robustness

create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Create profile with data from OAuth provider or defaults
  insert into public.profiles (id, email, full_name, avatar_url, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    new.phone
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);

  -- Create balance with $5 free tier
  insert into public.user_balances (user_id, balance_cents)
  values (new.id, 500)
  on conflict (user_id) do nothing;

  -- Create free subscription
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- Add INSERT policy for profiles (needed for trigger even with security definer in some cases)
drop policy if exists "Service role can insert profiles" on profiles;
create policy "Service role can insert profiles"
  on profiles for insert
  with check (true);
