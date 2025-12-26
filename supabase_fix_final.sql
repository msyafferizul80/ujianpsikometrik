-- FINAL FIX: Fix Join Error & Permissions

-- 1. Fix "Relationships" for Supabase Join
-- The error "Error fetching transactions" happens because Supabase doesn't know 'transactions' is related to 'profiles'.
-- We add an explicit Foreign Key to 'profiles' so the join works.

ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_profiles_fkey;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 2. Ensure Permissions are Correct (Stop Infinite Loop)
-- We re-apply the permissive read policy for profiles to prevent the "Empty Dashboard" bug.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Read All Profiles" ON public.profiles;
-- Allow ANY authenticated user to read profiles (Required for Admin checks)
CREATE POLICY "Allow Read All Profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


-- 3. Ensure Transactions are Readable by Admins
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
-- Allow Admins to view ALL transactions
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
