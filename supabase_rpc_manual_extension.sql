-- Create the admin_extend_subscription function to handle manual extensions with transaction logging
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
BEGIN
    -- 1. Get current subscription end date
    SELECT subscription_end_date INTO v_current_end
    FROM profiles
    WHERE id = p_user_id;

    -- 2. Calculate new end date
    IF v_current_end IS NULL OR v_current_end < NOW() THEN
        v_new_end := NOW() + (p_days || ' days')::INTERVAL;
    ELSE
        v_new_end := v_current_end + (p_days || ' days')::INTERVAL;
    END IF;

    -- 3. Update Profile
    UPDATE profiles
    SET 
        subscription_status = 'active',
        subscription_end_date = v_new_end,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- 4. Log Transaction (Revenue)
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
