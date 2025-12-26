-- CLEAN FIX: Run these blocks one by one if needed, or all at once.
-- We removed "BEGIN/COMMIT" so that one error doesn't stop the rest.

-- BLOCK 1: Fix Foreign Key (For Admin Dashboard "Error fetching transactions")
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_profiles_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- BLOCK 2: Create Safe Update Function (For Profile Settings)
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
GRANT EXECUTE ON FUNCTION update_own_profile_name TO authenticated;

-- BLOCK 3: Aggressive Policy Cleanup (For "Already Exists" Errors)
-- We disable RLS momentarily to reset policies cleanly
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Read All Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles; 

-- BLOCK 4: Re-apply Correct Policies
CREATE POLICY "Allow Read All Profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- BLOCK 5: Fix Transactions Policies
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;

CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT TO authenticated
USING (user_id = auth.uid());
