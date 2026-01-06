CREATE OR REPLACE FUNCTION admin_extend_subscription(
    p_user_id UUID,
    p_days INT,
    p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_end TIMESTAMPTZ;
    v_new_end TIMESTAMPTZ;
    v_current_tier TEXT;
BEGIN
    -- 1. Get current subscription info
    SELECT subscription_end_date, subscription_tier INTO v_current_end, v_current_tier
    FROM profiles
    WHERE id = p_user_id;

    -- 2. Calculate new end date
    IF v_current_end IS NULL OR v_current_end < NOW() THEN
        v_new_end := NOW() + (p_days || ' days')::INTERVAL;
    ELSE
        v_new_end := v_current_end + (p_days || ' days')::INTERVAL;
    END IF;

    -- 3. Determine new Tier (Smart Logic)
    -- If user is Free but paid money (amount > 0), upgrade them to 'momentum_7d' at minimum.
    IF (v_current_tier = 'free' OR v_current_tier IS NULL) AND p_amount > 0 THEN
         v_current_tier := 'momentum_7d';
    END IF;

    -- 4. Update Profile
    UPDATE profiles
    SET 
        subscription_status = 'active',
        subscription_tier = v_current_tier,
        subscription_end_date = v_new_end,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- 5. Log Transaction (Revenue)
    INSERT INTO transactions (
        user_id,
        amount, 
        status, 
        plan_id, 
        provider, 
        bill_id, 
        completed_at
    )
    VALUES (
        p_user_id,
        (p_amount * 100), -- Store in Cents
        'paid',
        'manual_extension',
        'admin',
        'manual_' || floor(extract(epoch from now())),
        NOW()
    );

END;
$$;
