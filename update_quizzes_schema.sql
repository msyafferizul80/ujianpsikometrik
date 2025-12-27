-- Add is_active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'is_active') THEN
        ALTER TABLE quizzes ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Check if any quizzes exist
SELECT * FROM quizzes;
