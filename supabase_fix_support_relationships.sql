-- FIX: Re-establish Relationship and Simplify RLS
BEGIN;

-- 1. Explicitly drop and recreate FK to ensure name consistency for Supabase Client
ALTER TABLE public.support_tickets 
DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;

ALTER TABLE public.support_tickets
ADD CONSTRAINT support_tickets_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- 2. Ensure RLS on profiles allows reading (Critical for the JOIN)
-- Re-affirm "allow all read" for profiles to avoid recursion/blocking
DROP POLICY IF EXISTS "Allow Read All Profiles" ON public.profiles;
CREATE POLICY "Allow Read All Profiles" ON public.profiles FOR SELECT USING (true);

-- 3. Simplify Admin Helper Function (Ensure it exists)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 4. Update Support Ticket Admin Policies to use RPC (Cleaner & Safer)
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;

CREATE POLICY "Admins can view all tickets"
ON public.support_tickets FOR SELECT
TO authenticated
USING ( is_admin() );

CREATE POLICY "Admins can update tickets"
ON public.support_tickets FOR UPDATE
TO authenticated
USING ( is_admin() );

-- 5. Refresh Schema Cache
NOTIFY pgrst, 'reload schema';

COMMIT;
