-- Fix v2: Complete RLS rewrite for profiles to eliminate infinite recursion
-- Problem: Any policy with subquery on 'profiles' table triggers RLS on itself
-- Solution: Use only auth.uid() comparison and direct column checks, no subqueries

-- Drop ALL existing SELECT policies on profiles
DROP POLICY IF EXISTS "Admin full access profiles" ON profiles;
DROP POLICY IF EXISTS "Business owner read tenant profiles" ON profiles;
DROP POLICY IF EXISTS "Courier read own profile" ON profiles;
DROP POLICY IF EXISTS "Users read own profile" ON profiles;

-- Drop existing INSERT/UPDATE policies too (they also have subqueries)
DROP POLICY IF EXISTS "Business owner insert courier profile" ON profiles;
DROP POLICY IF EXISTS "Courier update own profile" ON profiles;

-- Universal: read own profile (no subquery)
CREATE POLICY "users_read_own"
ON profiles FOR SELECT
USING (id = auth.uid() AND deleted_at IS NULL);

-- Universal: update own profile (no subquery)
CREATE POLICY "users_update_own"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin: full access via security definer function (avoids recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin' 
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "admin_all"
ON profiles FOR ALL
USING (is_admin() AND deleted_at IS NULL)
WITH CHECK (is_admin());

-- Business owner: read tenant profiles via helper function
CREATE OR REPLACE FUNCTION get_current_user_tenant_id()
RETURNS uuid AS $$
DECLARE
  tenant_uuid uuid;
BEGIN
  SELECT tenant_id INTO tenant_uuid
  FROM profiles
  WHERE id = auth.uid() AND deleted_at IS NULL;
  RETURN tenant_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "business_owner_read_tenant"
ON profiles FOR SELECT
USING (
  deleted_at IS NULL
  AND tenant_id = get_current_user_tenant_id()
  AND role IN ('business_owner', 'courier')
);

-- Business owner: insert courier into their tenant
CREATE POLICY "business_owner_insert_courier"
ON profiles FOR INSERT
WITH CHECK (
  role = 'courier'
  AND tenant_id = get_current_user_tenant_id()
);
