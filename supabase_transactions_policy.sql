-- Enable RLS for Transactions Table
alter table public.transactions enable row level security;

-- Allow Users to View their own transactions
create policy "Users can view own transactions"
  on public.transactions for select
  using ( auth.uid() = user_id );

-- Allow Users to Insert their own transactions (for Checkout Route)
-- Note: 'user_id' in row must match 'auth.uid()'
create policy "Users can insert own transactions"
  on public.transactions for insert
  with check ( auth.uid() = user_id );

-- Allow Updates? 
-- The Callback Route will attempt to update status to 'paid'.
-- If Callback is triggered by logged-in user (Redirect), this works.
-- If Callback is triggered by Webhook (Server), no user session exists.
-- However, for the redirect flow, we rely on the user session.
create policy "Users can update own transactions"
  on public.transactions for update
  using ( auth.uid() = user_id );
  
-- Important: Grant access to Authenticated and Anon (if needed for public hooks)
grant all on public.transactions to authenticated;
grant all on public.transactions to anon;
