-- 1. Admin Settings Table (Key-Value Store)
CREATE TABLE IF NOT EXISTS public.admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to READ 'exam_date' (public setting)
DROP POLICY IF EXISTS "Everyone can read exam_date" ON public.admin_settings;
CREATE POLICY "Everyone can read exam_date"
  ON public.admin_settings FOR SELECT
  USING ( key = 'exam_date' );

-- Allow Admins to ALL on admin_settings
DROP POLICY IF EXISTS "Admins can do everything on settings" ON public.admin_settings;
CREATE POLICY "Admins can do everything on settings"
  ON public.admin_settings FOR ALL
  USING ( 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- 2. Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'replied', 'closed'
    admin_reply TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  USING ( auth.uid() = user_id );

-- Users can create tickets
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- Admins can view ALL tickets
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  USING ( 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update tickets (reply/close)
DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;
CREATE POLICY "Admins can update tickets"
  ON public.support_tickets FOR UPDATE
  USING ( 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- 3. RPC: Set Exam Date (Admin Only)
DROP FUNCTION IF EXISTS set_exam_date(TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION set_exam_date(p_date TIMESTAMPTZ)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access Denied: Admin only';
    END IF;

    -- Upsert the setting
    INSERT INTO admin_settings (key, value, updated_by, updated_at)
    VALUES ('exam_date', p_date::text, auth.uid(), NOW())
    ON CONFLICT (key) 
    DO UPDATE SET 
        value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW();
END;
$$;


-- 4. RPC: Get Exam Date (Public)
DROP FUNCTION IF EXISTS get_exam_date();
CREATE OR REPLACE FUNCTION get_exam_date()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_date TEXT;
BEGIN
    SELECT value INTO v_date FROM admin_settings WHERE key = 'exam_date';
    RETURN v_date;
END;
$$;
