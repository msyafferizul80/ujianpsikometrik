-- LEADERBOARD & ATTEMPTS UPGRADE
BEGIN;

-- 1. Add user_id to attempts table
ALTER TABLE public.attempts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Create Leaderboard View (Latest high score per user)
-- Uses window function to get the BEST score for each user
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    MAX(a.score) as max_score,
    COUNT(a.id) as attempts_count,
    MAX(a.created_at) as last_attempt_at
FROM 
    public.profiles p
JOIN 
    public.attempts a ON p.id = a.user_id
GROUP BY 
    p.id, p.full_name, p.email
ORDER BY 
    max_score DESC, last_attempt_at ASC;

-- 3. Grant permissions
GRANT SELECT ON public.leaderboard_view TO authenticated;
GRANT SELECT ON public.leaderboard_view TO anon;

-- 4. RLS for Attempts (Ensure users can insert their own attempts)
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own attempts" ON public.attempts;
CREATE POLICY "Users can insert own attempts"
ON public.attempts FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL 
    -- Allow NULL for anonymous/demo attempts if needed, but preferably Authenticated
);

DROP POLICY IF EXISTS "Users can view own attempts" ON public.attempts;
CREATE POLICY "Users can view own attempts"
ON public.attempts FOR SELECT
TO authenticated
USING ( user_id = auth.uid() );

DROP POLICY IF EXISTS "Admins can view all attempts" ON public.attempts;
CREATE POLICY "Admins can view all attempts"
ON public.attempts FOR SELECT
TO authenticated
USING ( is_admin() );

COMMIT;
