-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read/write, Users can read only 'exam_date'
CREATE POLICY "Admins can do everything on settings"
ON admin_settings
FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can read exam_date"
ON admin_settings
FOR SELECT
TO authenticated
USING (key = 'exam_date');

CREATE POLICY "Public can read exam_date"
ON admin_settings
FOR SELECT
TO anon
USING (key = 'exam_date');

-- RPC to get exam date (helper)
CREATE OR REPLACE FUNCTION get_exam_date()
RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT (value->>'date')::TIMESTAMPTZ 
    FROM admin_settings 
    WHERE key = 'exam_date';
$$;

-- Seed default exam date if not exists (e.g. 60 days from now)
INSERT INTO admin_settings (key, value)
VALUES ('exam_date', jsonb_build_object('date', (NOW() + INTERVAL '60 days')))
ON CONFLICT (key) DO NOTHING;
