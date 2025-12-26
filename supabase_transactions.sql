-- Create Transactions Table for Payment History
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  bill_id text not null, -- Billplz ID
  plan_id text not null,
  amount int not null, -- In cents
  status text default 'pending', -- pending, paid, failed
  payment_url text,
  provider text default 'billplz',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

-- RLS
alter table public.transactions enable row level security;

create policy "Users can view own transactions"
  on public.transactions for select
  using ( auth.uid() = user_id );

-- RPC for Admin or Callback usage? 
-- The callback is server-side with Service Role (hopefully) or we rely on public insert if needed (bad).
-- Actually, checkout route is server-side. It can insert.
