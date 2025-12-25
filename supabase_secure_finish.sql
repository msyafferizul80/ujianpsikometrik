-- SECURITY RESTORE SCRIPT

-- 1. Enable semula RLS (PENTING!)
alter table public.profiles enable row level security;

-- 2. Pastikan policies wujud (Jika belum, script ini akan create)
-- Policy: Semua orang boleh *baca* profiles (diperlukan untuk UI paparkan nama user dsb)
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles for select using ( true );

-- Policy: Admin boleh *update* sesiapa sahaja
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile" 
  on public.profiles 
  for update 
  using ( 
    (select role from public.profiles where id = auth.uid()) = 'admin' 
  );

-- Policy: User biasa boleh update diri sendiri sahaja
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" 
  on public.profiles 
  for update 
  using ( auth.uid() = id );
