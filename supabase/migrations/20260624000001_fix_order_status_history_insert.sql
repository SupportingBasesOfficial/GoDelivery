-- Fix: order_status_history missing INSERT policy
-- Problem: trigger audit_order_status() inserts into order_status_history,
--          but only SELECT policies exist, causing RLS violation.
-- Solution: Add INSERT policy using the existing SECURITY DEFINER helper.

CREATE POLICY "Business owner insert order history"
ON order_status_history FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = order_status_history.order_id
        AND o.tenant_id = get_current_user_tenant_id()
    )
);

CREATE POLICY "Courier insert own order history"
ON order_status_history FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = order_status_history.order_id
        AND o.courier_id = auth.uid()
    )
);
