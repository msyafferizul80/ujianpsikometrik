-- EMERGENCY FIX: Simplify Profiles RLS to Stop Recursion
-- This script removes complex checks and allows authenticated users to read profiles.
-- This breaks the "Infinite Recursion" loop immediately.

-- 1. Reset Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 2. CREATE PERMISSIVE READ POLICY (Stops Recursion)
-- Allows ANY authenticated user to read ANY profile.
-- Justification: Necessary for Admin Dashboard "is_admin()" checks to work without looping.
CREATE POLICY "Allow Read All Profiles"
ON public.profiles FOR SELECT
TO authenticated
USING ( true );

-- 3. Keep WRITE Restricted
-- Only users can update their own profile (or use RPC)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING ( id = auth.uid() );

-- 4. Transactions Policy (Now Safe)
-- Since reading profiles is safe, checking "is_admin" (which reads profiles) is now safe.
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;

CREATE POLICY "Admins can view all transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);
