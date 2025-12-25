-- Skrip ini hanya mengemaskini Policy dan Trigger tanpa mengganggu masaalah "Table already exists"

-- 1. Tambah Policy untuk Admin (Drop dahulu jika ada untuk elak error duplicate)
drop policy if exists "Admins can update any profile" on public.profiles;

create policy "Admins can update any profile" 
  on public.profiles 
  for update 
  using ( 
    (select role from public.profiles where id = auth.uid()) = 'admin' 
  );

-- 2. Pastikan Trigger Function adalah yang terkini
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user')
  on conflict (id) do nothing; -- Elak error jika user dah wujud
  return new;
end;
$$ language plpgsql security definer;

-- 3. Reset Trigger (Safety measure)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created 
  after insert on auth.users 
  for each row execute procedure public.handle_new_user();
