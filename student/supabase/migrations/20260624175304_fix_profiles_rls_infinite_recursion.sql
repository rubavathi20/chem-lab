
-- Create a SECURITY DEFINER function to check admin status
-- This bypasses RLS when querying profiles, breaking the infinite recursion
CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Drop the recursive admin-view-profiles policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Recreate it using the SECURITY DEFINER function (no more recursion)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth_is_admin());
