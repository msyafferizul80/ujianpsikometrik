-- Knowledge Base CMS: Articles Table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS articles (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    title       text        NOT NULL,
    slug        text        NOT NULL UNIQUE,
    excerpt     text,
    content     text        NOT NULL DEFAULT '',   -- Markdown
    category    text        NOT NULL DEFAULT 'Tips',
    tags        text[]      DEFAULT '{}',
    author      text        DEFAULT 'Empire Kerjaya',
    cover_emoji text        DEFAULT '📚',
    reading_time int        DEFAULT 5,             -- minutes
    published   boolean     DEFAULT true,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Anyone can read published articles
CREATE POLICY "Anyone can read published articles"
    ON articles FOR SELECT
    USING (published = true);

-- Service role can do everything (admin API uses service role key)

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_articles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_articles_timestamp();
