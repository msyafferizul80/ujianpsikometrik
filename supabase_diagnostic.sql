-- D.I.A.G.N.O.S.T.I.C S.C.R.I.P.T

-- 1. Matikan RLS sekejap untuk pastikan kita boleh nampak semua data
alter table public.profiles disable row level security;

-- 2. Check adakah user wujud di auth.users?
select count(*) as "Bilangan User di Auth" from auth.users;

-- 3. Cuba masukkan data SHEFFI80 secara paksa
insert into public.profiles (id, email, full_name, role)
select 
  id, 
  email, 
  raw_user_meta_data->>'full_name', 
  'admin'
from auth.users
where email like '%sheffi80@gmail.com%' -- Target specific
on conflict (id) do update 
set role = 'admin'; -- Jika dah wujud, update jadi admin

-- 4. Paparkan semua data dalam profiles
select * from public.profiles;

-- Nota: Selepas ini, jika data keluar, kita boleh enable RLS semula:
-- alter table public.profiles enable row level security;
