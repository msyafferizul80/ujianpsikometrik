-- Script untuk memasukkan user sedia ada ke dalam table profiles

insert into public.profiles (id, email, full_name, role)
select 
  id, 
  email, 
  raw_user_meta_data->>'full_name',
  case 
    -- Gantikan dengan email admin anda jika perlu automatik jadi admin
    when email = 'sheffi80@gmail.com' then 'admin' 
    else 'user' 
  end
from auth.users
on conflict (id) do nothing;

-- Semak data selepas insert
select * from public.profiles;
