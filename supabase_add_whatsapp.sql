-- Add whatsapp column to profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'whatsapp') THEN
        ALTER TABLE profiles ADD COLUMN whatsapp text;
    END IF;
END $$;
