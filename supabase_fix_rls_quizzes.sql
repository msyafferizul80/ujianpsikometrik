-- FIX: Beri kebenaran kepada Admin untuk mengubah Quizzes dan Questions

-- 1. Table Quizzes
alter table public.quizzes enable row level security;

-- Allow Public Read (Supaya user boleh jawab kuiz)
drop policy if exists "Enable read access for all users" on public.quizzes;
create policy "Enable read access for all users" on public.quizzes for select using (true);

-- Allow Admin Full Access (Insert/Update/Delete)
drop policy if exists "Enable all access for admins" on public.quizzes;
create policy "Enable all access for admins" on public.quizzes for all 
using ( 
  (select role from public.profiles where id = auth.uid()) = 'admin' 
);


-- 2. Table Questions
alter table public.questions enable row level security;

-- Allow Public Read
drop policy if exists "Enable read access for all users" on public.questions;
create policy "Enable read access for all users" on public.questions for select using (true);

-- Allow Admin Full Access
drop policy if exists "Enable all access for admins" on public.questions;
create policy "Enable all access for admins" on public.questions for all 
using ( 
  (select role from public.profiles where id = auth.uid()) = 'admin' 
);
