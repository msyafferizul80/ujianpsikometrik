-- FIX: Grant Admin Access to Transactions
-- This policy allows admins to view ALL transactions.

-- 1. Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;

-- 3. Create Policy: Admins can view ALL
CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- 4. Create Policy: Users can view OWN (for History page)
CREATE POLICY "Users can view own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- 5. Grant Permissions
GRANT SELECT ON public.transactions TO authenticated;
