-- Function to activate subscription (Bypass RLS for Callback API)
CREATE OR REPLACE FUNCTION activate_subscription(
    p_user_id UUID,
    p_tier TEXT,
    p_end_date TIMESTAMPTZ,
    p_features TEXT[],  -- pass as array
    p_bill_id TEXT DEFAULT NULL,
    p_amount INT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Run as Database Owner (Bypasses RLS)
AS $$
BEGIN
    -- 1. Update Profile
    UPDATE profiles
    SET 
        subscription_status = 'active',
        subscription_tier = p_tier,
        subscription_end_date = p_end_date,
        features_unlocked = (
            SELECT COALESCE(features_unlocked, '[]'::jsonb) || to_jsonb(p_features)
            FROM profiles WHERE id = p_user_id
        )
    WHERE id = p_user_id;

    -- 2. Update Transaction (if bill_id provided)
    -- We assume the transaction row already exists via Checkout, but if not, we create it?
    -- Ideally Checkout created it clearly. We just update it to 'paid'.
    IF p_bill_id IS NOT NULL THEN
        -- Try to update existing transaction (from checkout)
        UPDATE transactions
        SET 
            status = 'paid',
            completed_at = NOW()
        WHERE bill_id = p_bill_id;

        -- If no transaction found (e.g. checkout RLS failed), INSERT it now
        IF NOT FOUND THEN
            INSERT INTO transactions (user_id, bill_id, plan_id, amount, status, provider, completed_at)
            VALUES (p_user_id, p_bill_id, p_tier, p_amount, 'paid', 'billplz', NOW());
        END IF;
    END IF;
END;
$$;
