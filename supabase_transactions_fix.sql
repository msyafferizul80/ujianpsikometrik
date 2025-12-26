-- Fix: Drop policies if they exist to avoid 'already exists' error
drop policy if exists "Users can view own transactions" on public.transactions;
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;

-- Enable RLS for Transactions Table
alter table public.transactions enable row level security;

-- Re-create Policies
create policy "Users can view own transactions"
  on public.transactions for select
  using ( auth.uid() = user_id );

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own transactions"
  on public.transactions for update
  using ( auth.uid() = user_id );

-- Grant access
grant all on public.transactions to authenticated;
grant all on public.transactions to anon;
