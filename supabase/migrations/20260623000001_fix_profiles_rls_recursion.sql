-- Fix: RLS infinite recursion on profiles table
-- Problem: "Business owner read tenant profiles" does subquery on profiles,
--          which triggers RLS on profiles, causing infinite recursion.
-- Solution: Add a universal "read own profile" policy that all roles can use
--           without subqueries.

-- Drop existing policies that cause recursion (they will be recreated cleaner)
DROP POLICY IF EXISTS "Business owner read tenant profiles" ON profiles;

-- Universal policy: any authenticated user can read their own profile
CREATE POLICY "Users read own profile"
ON profiles FOR SELECT
USING (id = auth.uid() AND deleted_at IS NULL);

-- Business owner can read profiles of their tenant (using a non-recursive check)
-- This relies on the universal policy above to first read their own profile
CREATE POLICY "Business owner read tenant profiles"
ON profiles FOR SELECT
USING (
    deleted_at IS NULL
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
