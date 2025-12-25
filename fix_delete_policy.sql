-- Enable DELETE for Quizzes (Admin Action)
-- CAUTION: This allows anyone with the Anon Key to delete quizzes. 
-- Since your app currently uses a "Fake Login" (LocalStorage), we must allow Public/Anon access for now.
-- Ideally, you should switch to Supabase Auth completely later.

-- 1. Allow Delete on Quizzes
CREATE POLICY "Enable delete for everyone" ON quizzes FOR DELETE USING (true);

-- 2. Allow Delete on Attempts (Required for cascade)
CREATE POLICY "Enable delete for everyone" ON attempts FOR DELETE USING (true);

-- 3. Allow Delete on Questions
CREATE POLICY "Enable delete for everyone" ON questions FOR DELETE USING (true);
