-- Job Tag Options — Flexible Tag Manager
-- Run in Supabase SQL Editor (project: hfdadqsrwpopzsgtykjb)

CREATE TABLE IF NOT EXISTS job_tag_options (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL UNIQUE,
    created_at  timestamptz DEFAULT now()
);

-- Seed with initial tags (admin can edit/delete these anytime)
INSERT INTO job_tag_options (name) VALUES
    ('Penolong Pegawai Tadbir'),
    ('Pegawai Eksekutif'),
    ('Pegawai Sains'),
    ('Guru'),
    ('Jurutera'),
    ('Jururawat'),
    ('Pembantu Tadbir'),
    ('Penolong Pegawai Pertanian')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS (admin only can modify, anyone can read)
ALTER TABLE job_tag_options ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read tag options
CREATE POLICY "Anyone can view tags"
    ON job_tag_options FOR SELECT
    USING (true);

-- Only service role (admin API) can insert/update/delete
-- (managed via service role key in API routes)
