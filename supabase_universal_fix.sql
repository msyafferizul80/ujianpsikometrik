-- UNIVERSAL FIX: One Script To Fix Them All
-- Run this to resolve Profile Updates, Admin Dashboard, and Transaction errors.

BEGIN; -- Start Transaction

-- 1. FIX: Missing Foreign Key (Causes "Error fetching transactions")
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_profiles_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id);


-- 2. FIX: Profile RLS (Causes "Error updating profile")
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Reset Policies
DROP POLICY IF EXISTS "Allow Read All Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create Permissive Read (Fixes Recursion & Admin Checks)
CREATE POLICY "Allow Read All Profiles"
ON public.profiles FOR SELECT
TO authenticated
USING ( true );

-- Create Update Own (Allows users to save settings)
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING ( id = auth.uid() );


-- 3. FIX: RPC Function (For Safe Profile Update)
CREATE OR REPLACE FUNCTION update_own_profile_name(p_full_name text)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    full_name = p_full_name,
    updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;


-- 4. FIX: Transactions RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;

-- Admin View All
CREATE POLICY "Admins can view all transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- User View Own
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING ( user_id = auth.uid() );


-- 5. Grant Permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT EXECUTE ON FUNCTION update_own_profile_name TO authenticated;

COMMIT; -- Commit Changes
