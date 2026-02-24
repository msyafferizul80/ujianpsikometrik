-- Task 4: AI Mock Interview Module Schema

CREATE TABLE IF NOT EXISTS public.mock_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_role TEXT NOT NULL,
    scenario_type TEXT DEFAULT 'General', -- e.g., 'Behavioral', 'Technical', 'General'
    questions JSONB DEFAULT '[]'::jsonb, -- Array of { q_id: "1", text: "..." }
    responses JSONB DEFAULT '[]'::jsonb, -- Array of { q_id: "1", audio_url: "...", text_transcript: "..." }
    ai_feedback JSONB, -- AI analysis of responses { score: 85, strengths: [], weaknesses: [] }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.mock_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own mock interviews"
    ON public.mock_interviews
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_mock_interviews_modtime
    BEFORE UPDATE ON public.mock_interviews
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();
