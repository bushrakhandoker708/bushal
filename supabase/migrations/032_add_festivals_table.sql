-- ============================================================================
-- supabase/migrations/032_add_festivals_table.sql
-- ============================================================================
-- EXPLANATION:
-- This migration fixes the "Hardcoded Festival Dates" time-bomb bug. Previously, 
-- festival dates (especially Islamic holidays like Eid) were hardcoded in the 
-- frontend and Python ML service for 2026. This breaks in 2027 because Islamic 
-- holidays shift ~11 days earlier each year based on the lunar calendar.
--
-- We create a dynamic `festivals` table in PostgreSQL to store these events.
-- The Python ML microservice and the Next.js frontend will now fetch from this 
-- table, allowing admins to update dates yearly without touching the codebase.
-- ============================================================================

-- 1. Create the festivals table
CREATE TABLE IF NOT EXISTS public.festivals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  boost_factor numeric NOT NULL DEFAULT 1.5,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.festivals ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Public/Authenticated users can read festivals (needed for frontend forecasting UI)
CREATE POLICY "Public can read festivals"
ON public.festivals FOR SELECT
USING (true);

-- Only Admins and Service Role (Python ML cron) can manage festivals
CREATE POLICY "Admins and Service Role can manage festivals"
ON public.festivals FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
  OR auth.role() = 'service_role'
);

-- 4. Seed initial data for 2026 (Approximate lunar calendar dates)
-- Note: These should be updated annually by the admin before the year starts.
INSERT INTO public.festivals (name, start_date, end_date, boost_factor) VALUES
  ('Valentine''s Day 2026', '2026-02-14', '2026-02-14', 1.6),
  ('Eid-ul-Fitr 2026', '2026-03-20', '2026-03-22', 2.5),
  ('Independence Day 2026', '2026-03-26', '2026-03-26', 1.4),
  ('Pohela Boishakh 2026', '2026-04-14', '2026-04-16', 1.8),
  ('Eid-ul-Adha 2026', '2026-05-27', '2026-05-29', 2.2),
  ('Durga Puja 2026', '2026-10-17', '2026-10-21', 1.7),
  ('Winter Sale Season 2026', '2026-12-15', '2026-12-31', 2.0),
  ('Victory Day 2026', '2026-12-16', '2026-12-16', 1.3)
ON CONFLICT DO NOTHING; -- Safe to re-run

-- 5. Create an index for fast date-range queries
-- The ML service and frontend will frequently query: WHERE start_date >= NOW()
CREATE INDEX IF NOT EXISTS idx_festivals_start_date ON public.festivals(start_date);