-- FIX RLS POLICY UNTUK ATTEMPTS TABLE
-- Jalankan SQL ini dalam Supabase Dashboard → SQL Editor

-- 1. Semak policies semasa (untuk reference)
-- SELECT * FROM pg_policies WHERE tablename = 'attempts';

-- 2. Pastikan INSERT policy wujud untuk authenticated users
DROP POLICY IF EXISTS "Public attempts can be inserted" ON public.attempts;
DROP POLICY IF EXISTS "Authenticated users can insert attempts" ON public.attempts;
DROP POLICY IF EXISTS "Users can insert own attempts" ON public.attempts;

-- 3. Buat policy baru yang betul
-- Benarkan authenticated users insert rekod attempts mereka sendiri
CREATE POLICY "Users can insert own attempts"
    ON public.attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 4. Benarkan authenticated users baca attempts mereka sendiri
DROP POLICY IF EXISTS "Users can view own attempts" ON public.attempts;
CREATE POLICY "Users can view own attempts"
    ON public.attempts
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. Benarkan authenticated users update attempts mereka sendiri (untuk heartbeat)
DROP POLICY IF EXISTS "Users can update own attempts" ON public.attempts;
CREATE POLICY "Users can update own attempts"
    ON public.attempts
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- 6. Grant permissions
GRANT ALL ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;

-- 7. Verify
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'attempts';
