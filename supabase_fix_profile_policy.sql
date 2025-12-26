-- POLICY FIX: Allow users to update their own profiles
-- Run this script in the Supabase SQL Editor

-- 1. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts (optional, but safer for "fix" scripts)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 3. Re-create the Update Policy
-- This allows a user to UPDATE rows where the 'id' matches their authenticated UID
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 4. Re-create the Select Policy (just in case)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 5. Grant permissions (Standard precaution)
GRANT UPDATE ON public.profiles TO authenticated;
