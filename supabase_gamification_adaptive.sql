-- Task 2: Adaptive Learning & Gamification Schema Updates

-- 1. Add difficulty_level to questions
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS difficulty_level SMALLINT DEFAULT 1;

-- 2. Create user_streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for user_streaks
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streaks" 
    ON public.user_streaks FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Optional trigger function to update the 'updated_at' column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_streaks_modtime
    BEFORE UPDATE ON public.user_streaks
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();


-- 3. Create badges table (Catalog)
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for badges
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges" 
    ON public.badges FOR SELECT TO authenticated
    USING (true);


-- 4. Create user_badges table (Mapping)
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, badge_id) -- Prevent duplicate badges
);

-- Enable RLS for user_badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges" 
    ON public.user_badges FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 5. Predictive Score Logic Function
CREATE OR REPLACE FUNCTION calculate_predictive_score(p_user_id UUID)
RETURNS json AS $$
DECLARE
    v_avg_score NUMERIC;
    v_streak INTEGER;
    v_total_attempts INTEGER;
    v_probability NUMERIC;
    v_consistency_multiplier NUMERIC;
BEGIN
    -- 1. Get user's average score across all attempts
    SELECT 
        COALESCE(AVG(score), 0),
        COUNT(*)
    INTO 
        v_avg_score,
        v_total_attempts
    FROM public.exam_attempts 
    WHERE user_id = p_user_id;

    -- 2. Get user's current streak
    SELECT COALESCE(current_streak, 0)
    INTO v_streak
    FROM public.user_streaks
    WHERE user_id = p_user_id;

    -- 3. Base probability calculation
    IF v_total_attempts = 0 THEN
        RETURN json_build_object('probability', 0, 'avgScore', 0, 'streak', 0, 'status', 'Memerlukan lebih banyak latihan');
    END IF;

    -- Formula: Avg Score is 70% weight, Consistency (Streak) is 30% weight
    -- Cap multiplier at 1.15 (15% bonus for 10+ day streak)
    v_consistency_multiplier := LEAST(1.0 + (v_streak * 0.015), 1.15);
    
    -- Normalize score to probability 
    v_probability := LEAST(v_avg_score * v_consistency_multiplier, 98.0); -- Cap at 98% because nothing is 100% certain

    -- Return JSON object
    RETURN json_build_object(
        'probability', ROUND(v_probability, 1), 
        'avgScore', ROUND(v_avg_score, 1), 
        'streak', v_streak,
        'status', CASE 
            WHEN v_probability > 80 THEN 'Cemerlang'
            WHEN v_probability > 60 THEN 'Sederhana'
            ELSE 'Berisiko'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
