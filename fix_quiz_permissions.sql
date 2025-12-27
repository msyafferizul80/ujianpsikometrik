-- 1. Enable RLS (Good practice, ensuring we control it)
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts (Clean slate for this table)
DROP POLICY IF EXISTS "Allow all access to quizzes" ON quizzes;
DROP POLICY IF EXISTS "Public select quizzes" ON quizzes;
DROP POLICY IF EXISTS "Authenticated insert quizzes" ON quizzes;

-- 3. Create a permissive policy for authenticated users (Admins/Users)
-- This allows anyone logged in (or using the anon key if we want public read) to access.
-- For Admin Dashboard, you need READ, DELETE, UPDATE.
CREATE POLICY "Allow all access to quizzes"
ON quizzes
FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Verify data exists (Diagnostic)
SELECT count(*) as total_quizzes FROM quizzes;
