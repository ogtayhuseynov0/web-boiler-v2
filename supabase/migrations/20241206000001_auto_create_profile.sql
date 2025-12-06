-- Function to auto-create profile and balance when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Create profile
  insert into public.profiles (id, email, phone)
  values (
    new.id,
    new.email,
    new.phone
  );

  -- Create balance with $5 free tier
  insert into public.user_balances (user_id, balance_cents)
  values (new.id, 500);

  -- Create free subscription
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active');

  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Add phone column to profiles if not exists
alter table profiles add column if not exists phone text;
