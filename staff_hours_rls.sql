-- ============================================================
-- STAFF WORKING HOURS — PUBLIC READ + OWNER WRITE
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Enable RLS on working_hours (already enabled if you ran previous migrations)
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing public SELECT policy if any, then recreate it
DROP POLICY IF EXISTS "Public can read working_hours" ON working_hours;

CREATE POLICY "Public can read working_hours"
ON working_hours
FOR SELECT
USING (true);
-- This allows anonymous booking-page clients to read all working hours
-- (including staff-specific hours) so the wizard can compute available slots.

-- 3. Allow authenticated business owners/admins to write working_hours
DROP POLICY IF EXISTS "Owners can manage working_hours" ON working_hours;

CREATE POLICY "Owners can manage working_hours"
ON working_hours
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM staff s
    WHERE s.business_id = working_hours.business_id
      AND s.user_id = auth.uid()
      AND s.system_role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM staff s
    WHERE s.business_id = working_hours.business_id
      AND s.user_id = auth.uid()
      AND s.system_role IN ('owner', 'admin')
  )
);

-- ============================================================
-- APPOINTMENTS — PUBLIC INSERT for booking page
-- ============================================================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to INSERT new appointments (booking page)
DROP POLICY IF EXISTS "Public can create appointments" ON appointments;

CREATE POLICY "Public can create appointments"
ON appointments
FOR INSERT
WITH CHECK (true);

-- Allow anonymous users to READ appointments (for slot conflict checking)
DROP POLICY IF EXISTS "Public can read appointments for conflict check" ON appointments;

CREATE POLICY "Public can read appointments for conflict check"
ON appointments
FOR SELECT
USING (true);

-- ============================================================
-- CLIENTS — PUBLIC INSERT + SELECT
-- ============================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can create clients" ON clients;

CREATE POLICY "Public can create clients"
ON clients
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can find clients by phone" ON clients;

CREATE POLICY "Public can find clients by phone"
ON clients
FOR SELECT
USING (true);

-- ============================================================
-- DONE — All required policies have been applied.
-- ============================================================
