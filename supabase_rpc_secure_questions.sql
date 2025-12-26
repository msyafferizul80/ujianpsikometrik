-- Function to get questions securely based on user subscription
-- This prevents "Free" users from fetching all 100 questions via network inspection

CREATE OR REPLACE FUNCTION get_secure_questions(p_quiz_id INT, p_user_id UUID)
RETURNS TABLE (
    id BIGINT,
    quiz_id BIGINT,
    question_text TEXT,
    options JSONB,
    correct_answer TEXT,
    teras TEXT,
    explanation TEXT,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subscription_tier TEXT;
    v_role TEXT;
BEGIN
    -- 1. Get User's Role and Subscription Tier
    SELECT subscription_tier, role 
    INTO v_subscription_tier, v_role
    FROM profiles 
    WHERE profiles.id = p_user_id;

    -- 2. Determine Limit
    -- If Admin OR Premium (exam_ready/cram_24h/addon), NO LIMIT
    -- If Free, LIMIT 10
    
    IF v_role = 'admin' OR v_subscription_tier IN ('exam_ready', 'cram_24h') THEN
        RETURN QUERY
        SELECT q.id, q.quiz_id, q.question_text, q.options, q.correct_answer, q.teras, q.explanation, q.created_at
        FROM questions q
        WHERE q.quiz_id = p_quiz_id
        ORDER BY q.id ASC;
    ELSE
        RETURN QUERY
        SELECT q.id, q.quiz_id, q.question_text, q.options, q.correct_answer, q.teras, q.explanation, q.created_at
        FROM questions q
        WHERE q.quiz_id = p_quiz_id
        ORDER BY q.id ASC
        LIMIT 10;
    END IF;
END;
$$;
