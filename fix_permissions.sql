-- FIX PEMADAMAN (DELETE PERMISSIONS)
-- Salin dan Run kod ini di Supabase SQL Editor

-- 1. Drop existing policies to avoid conflicts (jika ada)
DROP POLICY IF EXISTS "Enable delete for everyone" ON quizzes;
DROP POLICY IF EXISTS "Enable delete for everyone" ON attempts;
DROP POLICY IF EXISTS "Enable delete for everyone" ON questions;

-- 2. Create Permissions
-- Allow Delete for Quizzes
CREATE POLICY "Enable delete for everyone" ON quizzes FOR DELETE USING (true);

-- Allow Delete for Attempts
CREATE POLICY "Enable delete for everyone" ON attempts FOR DELETE USING (true);

-- Allow Delete for Questions
CREATE POLICY "Enable delete for everyone" ON questions FOR DELETE USING (true);

-- 3. Verify
SELECT * FROM pg_policies WHERE policyname = 'Enable delete for everyone';
