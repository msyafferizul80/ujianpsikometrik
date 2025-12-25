-- FIX MUKTAMAD (DATABASE CASCADE)
-- Ini akan memustahilkan error "Foreign Key Constraint" berlaku lagi.
-- Database akan automatik delete semua rekod pelajar bila kuiz dipadam.

-- 1. Buang constraint lama yang menyekat deletion
ALTER TABLE attempts
DROP CONSTRAINT IF EXISTS attempts_quiz_id_fkey;

-- 2. Tambah constraint baru dengan kuasa "ON DELETE CASCADE"
ALTER TABLE attempts
ADD CONSTRAINT attempts_quiz_id_fkey
FOREIGN KEY (quiz_id)
REFERENCES quizzes(id)
ON DELETE CASCADE;

-- 3. (Optional) Pastikan RLS tidak mengganggu
CREATE POLICY "Enable delete for everyone" ON quizzes FOR DELETE USING (true);
