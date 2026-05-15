-- Migration: Add display_order column to quizzes table
-- Run this in your Supabase SQL Editor

-- Step 1: Add display_order column (nullable first for safe migration)
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Step 2: Backfill existing rows based on created_at order (oldest = lowest order = appears first)
-- This ensures existing data gets a sensible default ordering
WITH ordered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
    FROM quizzes
)
UPDATE quizzes
SET display_order = ordered.rn
FROM ordered
WHERE quizzes.id = ordered.id;

-- Step 3: Make the column not null with a safe default for future inserts
ALTER TABLE quizzes ALTER COLUMN display_order SET DEFAULT 9999;
ALTER TABLE quizzes ALTER COLUMN display_order SET NOT NULL;

-- Step 4: Create an index to speed up ORDER BY queries
CREATE INDEX IF NOT EXISTS idx_quizzes_display_order ON quizzes (display_order ASC);
