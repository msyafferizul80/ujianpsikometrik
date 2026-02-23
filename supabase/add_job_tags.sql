-- Priority 4: Job-Specific Question Bank
-- Run in Supabase SQL Editor (project: hfdadqsrwpopzsgtykjb)

-- 1. Add job_tags column to quizzes table
ALTER TABLE quizzes
    ADD COLUMN IF NOT EXISTS job_tags text[] DEFAULT '{}';

-- 2. Add a comment for documentation
COMMENT ON COLUMN quizzes.job_tags IS 'Array of job tags e.g. {"Penolong Pegawai Tadbir", "Pegawai Tadbir"}. Used for filtering in quiz select page.';

-- 3. Example: Tag existing quizzes (run manually as needed)
-- UPDATE quizzes SET job_tags = ARRAY['Penolong Pegawai Tadbir', 'Pegawai Tadbir'] WHERE id = 'your-quiz-id-here';
