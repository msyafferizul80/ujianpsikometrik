-- 1. Create Profile Table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text default 'user' check (role in ('user', 'admin')),
  status text default 'active' check (status in ('active', 'suspended')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table public.profiles enable row level security;

-- 3. Create Policies

-- READ: Everyone can see profiles (needed for Admin list, and User seeing their own)
-- You might want to restrict this to "Admins + Own Profile" for privacy, but for now Public is easiest for the list.
create policy "Profiles are viewable by everyone" 
  on profiles for select 
  using ( true );

-- UPDATE: Users can update their own profile
create policy "Users can update own profile" 
  on profiles for update 
  using ( auth.uid() = id );

-- UPDATE: Admins can update ANY profile
-- This uses a subquery to check if the *requester* is an admin.
create policy "Admins can update any profile" 
  on profiles for update 
  using ( 
    (select role from public.profiles where id = auth.uid()) = 'admin' 
  );

-- 4. Triggers for auto-creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created 
  after insert on auth.users 
  for each row execute procedure public.handle_new_user();

-- NOTE: If you already have users, you might need to insert them manually into profiles once.
-- Example: insert into profiles (id, email) values ('uuid...', 'email@...');
