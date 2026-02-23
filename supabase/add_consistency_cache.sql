-- Run this once in your Supabase SQL Editor (project: hfdadqsrwpopzsgtykjb)
-- Adds columns to cache the AI consistency analysis per attempt

ALTER TABLE attempts
    ADD COLUMN IF NOT EXISTS consistency_score     integer      DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS inconsistency_report  jsonb        DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS started_at            timestamptz  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS duration_minutes      integer      DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS tab_switches          integer      DEFAULT 0,
    ADD COLUMN IF NOT EXISTS violations            jsonb        DEFAULT '[]'::jsonb;
