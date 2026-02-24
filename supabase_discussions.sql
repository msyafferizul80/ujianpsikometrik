-- Task 5: Community & Social Learning Schema

CREATE TABLE IF NOT EXISTS public.discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id INTEGER REFERENCES public.questions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow anonymous lingering after delete
    anonymous_name TEXT NOT NULL, -- e.g., 'Calon_PTD_123'
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view discussions
CREATE POLICY "Anyone can view discussions"
    ON public.discussions
    FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can insert their own discussions
CREATE POLICY "Users can create discussions"
    ON public.discussions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own discussions
CREATE POLICY "Users can update their own discussions"
    ON public.discussions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own discussions 
CREATE POLICY "Users can delete their own discussions"
    ON public.discussions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE TRIGGER update_discussions_modtime
    BEFORE UPDATE ON public.discussions
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();
