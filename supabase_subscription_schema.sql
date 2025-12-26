-- Add subscription tracking columns to profiles table

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free', -- 'free', 'cram_24h', 'exam_ready', 'addon_ai'
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active', -- 'active', 'expired'
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS features_unlocked JSONB DEFAULT '[]'::jsonb; -- e.g. ["ai_coach", "full_bank"]

-- Update RLS policies to allow users to read their own subscription status (already covered by existing SELECT policy usually, but good to verify)
-- insuring the existing policy covers these new columns automatically since it usually selects all or specific columns.

-- Index for faster querying of active subscriptions
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_end_date ON profiles(subscription_end_date);

-- Comment on columns
COMMENT ON COLUMN profiles.subscription_tier IS 'Tier of the subscription: free, cram_24h, exam_ready';
COMMENT ON COLUMN profiles.features_unlocked IS 'Array of specific features unlocked for the user';
