-- FIX: Add missing 'updated_at' column to profiles
-- The error logs confirmed that the 'profiles' table is missing the 'updated_at' column.
-- This script adds it and ensures the update function works.

-- 1. Add the missing column safely
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Re-create the RPC function (it depends on this column)
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

-- 3. Grant execute permission
GRANT EXECUTE ON FUNCTION update_own_profile_name TO authenticated;
