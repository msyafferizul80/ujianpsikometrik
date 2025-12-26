-- 1. Create Transactions Table (if not exists)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    bill_id TEXT,
    plan_id TEXT,
    amount INT,
    status TEXT DEFAULT 'pending',
    provider TEXT DEFAULT 'billplz',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 2. Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. Update Policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  USING ( auth.uid() = user_id );

-- 4. Grant Permissions
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

-- 5. Update RPC Function (The Checkpoint logic)
CREATE OR REPLACE FUNCTION activate_subscription(
    p_user_id UUID,
    p_tier TEXT,
    p_end_date TIMESTAMPTZ,
    p_features TEXT[], 
    p_bill_id TEXT DEFAULT NULL,
    p_amount INT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update Profile
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

    -- Update Transaction
    IF p_bill_id IS NOT NULL THEN
        UPDATE transactions
        SET 
            status = 'paid',
            completed_at = NOW()
        WHERE bill_id = p_bill_id;

        IF NOT FOUND THEN
            INSERT INTO transactions (user_id, bill_id, plan_id, amount, status, provider, completed_at)
            VALUES (p_user_id, p_bill_id, p_tier, p_amount, 'paid', 'billplz', NOW());
        END IF;
    END IF;
END;
$$;
