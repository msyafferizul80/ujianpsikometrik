-- Create the categories table
CREATE TABLE IF NOT EXISTS public.article_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    emoji TEXT NOT NULL DEFAULT '📚',
    color_class TEXT NOT NULL DEFAULT 'bg-gray-100 text-gray-600',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "public_read_categories" ON public.article_categories
FOR SELECT USING (true);

-- Allow all writes (for admin/anon fallback)
CREATE POLICY "allow_all_write" ON public.article_categories
FOR ALL USING (true) WITH CHECK (true);

-- Create RPC functions to bypass PostgREST cache (used by API)
CREATE OR REPLACE FUNCTION get_article_categories()
RETURNS TABLE(id uuid, name text, emoji text, color_class text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id, name, emoji, color_class, created_at
    FROM article_categories
    ORDER BY created_at ASC;
$$;

CREATE OR REPLACE FUNCTION insert_article_category(
    p_name text,
    p_emoji text,
    p_color_class text
)
RETURNS TABLE(id uuid, name text, emoji text, color_class text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
AS $$
    INSERT INTO article_categories(name, emoji, color_class)
    VALUES (p_name, p_emoji, p_color_class)
    RETURNING id, name, emoji, color_class, created_at;
$$;

CREATE OR REPLACE FUNCTION delete_article_category(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    DELETE FROM article_categories WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION get_article_categories() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION insert_article_category(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION delete_article_category(uuid) TO anon, authenticated, service_role;

-- Insert default categories
INSERT INTO public.article_categories (name, emoji, color_class) VALUES
    ('Emosi', '❤️', 'bg-rose-100 text-rose-700'),
    ('Sosial', '🤝', 'bg-sky-100 text-sky-700'),
    ('Komunikasi', '💬', 'bg-emerald-100 text-emerald-700'),
    ('Kepimpinan', '🎯', 'bg-amber-100 text-amber-700'),
    ('Integriti', '🛡️', 'bg-violet-100 text-violet-700'),
    ('Tips', '💡', 'bg-yellow-100 text-yellow-700'),
    ('Contoh Soalan', '📝', 'bg-blue-100 text-blue-700')
ON CONFLICT (name) DO NOTHING;
