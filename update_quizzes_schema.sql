-- Add is_premium column to quizzes table
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT TRUE;

-- Update existing quizzes to preserve current "first one free" logic
-- We'll identify the oldest quiz (created_at) and set it to is_premium = FALSE
WITH oldest_quiz AS (
  SELECT id FROM quizzes ORDER BY created_at ASC LIMIT 1
)
UPDATE quizzes
SET is_premium = FALSE
WHERE id IN (SELECT id FROM oldest_quiz);

-- All other quizzes will default to TRUE (Premium)
