-- supabase/migrations/040_fix_security_and_ml_labels.sql
-- ============================================================================
-- EXPLANATION:
-- 1. Updates customer_segments to use 'Anomalous' instead of 'Fake Orders'.
--    K-Means identifies statistical outliers, not intent. Labeling them as
--    "Fake" causes false positives for legitimate bulk buyers or new users.
-- 2. Hardens confirm_order_and_reduce_stock by removing SECURITY DEFINER.
--    It now uses SECURITY INVOKER and explicit ownership/role checks inside
--    the function body. This ensures RLS policies are respected and prevents
--    privilege escalation if the function is called directly.
-- ============================================================================

-- 1. Update Customer Segments Constraint
-- Drop existing check constraint if it exists
ALTER TABLE public.customer_segments 
DROP CONSTRAINT IF EXISTS customer_segments_segment_check;

-- Add new constraint allowing 'Anomalous' and removing 'Fake Orders'
ALTER TABLE public.customer_segments 
ADD CONSTRAINT customer_segments_segment_check 
CHECK (segment IN ('VIP', 'Loyal', 'Normal', 'High Risk', 'Anomalous'));

-- Update any existing 'Fake Orders' records to 'Anomalous'
UPDATE public.customer_segments 
SET segment = 'Anomalous' 
WHERE segment = 'Fake Orders';

-- 2. Harden confirm_order_and_reduce_stock Function
-- We replace the function to use SECURITY INVOKER instead of DEFINER.
-- This forces the function to respect the caller's permissions.
CREATE OR REPLACE FUNCTION public.confirm_order_and_reduce_stock(
    p_order_id uuid,
    p_new_status text
)
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY INVOKER -- Changed from DEFINER to INVOKER
AS $$
DECLARE
    v_order record;
    v_item record;
    v_current_stock int;
    v_steps jsonb;
    v_label text;
    v_stock_reduced_now boolean;
    v_caller_is_admin boolean;
BEGIN
    -- Check if the caller is an admin
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) INTO v_caller_is_admin;

    -- Fetch order and lock it for update
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    
    IF v_order IS NULL THEN
        RAISE EXCEPTION 'order_not_found';
    END IF;

    -- SECURITY CHECK: Ensure the caller is either an Admin OR the owner of the order
    IF NOT v_caller_is_admin AND v_order.user_id != auth.uid() THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    -- If stock hasn't been reduced yet, reduce it now
    IF NOT v_order.inventory_reduced THEN
        FOR v_item IN
            SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id
        LOOP
            SELECT stock_quantity INTO v_current_stock
            FROM public.products WHERE id = v_item.product_id FOR UPDATE;
            
            IF v_current_stock >= v_item.quantity THEN
                UPDATE public.products
                SET stock_quantity = stock_quantity - v_item.quantity
                WHERE id = v_item.product_id;
            ELSE
                -- Safety fallback: if stock is somehow less than ordered, set to 0
                UPDATE public.products
                SET stock_quantity = 0
                WHERE id = v_item.product_id;
            END IF;
            
            -- Sync in_stock boolean based on new quantity
            UPDATE public.products
            SET in_stock = (stock_quantity > 0)
            WHERE id = v_item.product_id;
        END LOOP;
        
        -- Mark order as inventory reduced so it never happens again
        UPDATE public.orders SET inventory_reduced = true WHERE id = p_order_id;
        v_stock_reduced_now := true;
    ELSE
        v_stock_reduced_now := false;
    END IF;

    -- Map status to human-readable label for the delivery timeline
    v_label := CASE
        WHEN p_new_status = 'confirmed' THEN 'Order Confirmed'
        WHEN p_new_status = 'processing' THEN 'Processing'
        WHEN p_new_status = 'shipped' THEN 'Shipped'
        WHEN p_new_status = 'out_for_delivery' THEN 'Out for Delivery'
        WHEN p_new_status = 'delivered' THEN 'Delivered'
        WHEN p_new_status = 'cancelled' THEN 'Cancelled'
        ELSE p_new_status
    END;

    -- Append new step to the delivery timeline JSONB array
    v_steps := COALESCE(v_order.delivery_steps, '[]'::jsonb) || jsonb_build_object(
        'status', p_new_status,
        'label', v_label,
        'timestamp', now()::text
    );

    -- Update the order status, delivery status, and timeline
    UPDATE public.orders
    SET
        delivery_status = p_new_status,
        status = CASE
            WHEN p_new_status = 'delivered' THEN 'fulfilled'
            WHEN p_new_status = 'cancelled' THEN 'cancelled'
            ELSE 'pending'
        END,
        delivery_steps = v_steps,
        updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'inventory_reduced_now', v_stock_reduced_now,
        'delivery_status', p_new_status
    );
END;
$$;

-- Re-grant execute permissions to authenticated users (admins)
GRANT EXECUTE ON FUNCTION confirm_order_and_reduce_stock(uuid, text) TO authenticated;

-- 3. Ensure Fraud Review Queue Constraints are Correct
-- (This is mostly a safety check as the table was created in migration 033)
ALTER TABLE public.fraud_review_queue 
DROP CONSTRAINT IF EXISTS fraud_review_queue_status_check;

ALTER TABLE public.fraud_review_queue 
ADD CONSTRAINT fraud_review_queue_status_check 
CHECK (status IN ('pending', 'reviewed', 'cancelled'));