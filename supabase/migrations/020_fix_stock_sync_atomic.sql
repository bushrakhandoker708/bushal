-- supabase/migrations/020_fix_stock_sync_atomic.sql
-- Fixes a race condition and stale data bug in the confirm_order_and_reduce_stock function.
-- Previously, the in_stock boolean was updated in a separate statement, which could read stale data.
-- This migration uses a single atomic UPDATE with RETURNING to ensure stock_quantity and in_stock are always perfectly synced.

CREATE OR REPLACE FUNCTION public.confirm_order_and_reduce_stock(
    p_order_id uuid,
    p_new_status text
)
RETURNS jsonb AS $$
DECLARE
    v_order record;
    v_item record;
    v_new_stock int;
    v_steps jsonb;
    v_label text;
    v_stock_reduced_now boolean;
BEGIN
    -- Fetch order and lock it for update to prevent race conditions
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    
    IF v_order IS NULL THEN
        RAISE EXCEPTION 'order_not_found';
    END IF;

    -- Reduce stock exactly once
    IF NOT v_order.inventory_reduced THEN
        FOR v_item IN 
            SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id
        LOOP
            -- Single atomic UPDATE with RETURNING
            -- GREATEST ensures stock never goes below 0
            -- in_stock is calculated based on the NEW stock_quantity value in the same statement
            UPDATE public.products 
            SET 
                stock_quantity = GREATEST(stock_quantity - v_item.quantity, 0),
                in_stock = (stock_quantity - v_item.quantity) > 0
            WHERE id = v_item.product_id
            RETURNING stock_quantity INTO v_new_stock;
            
            -- Optional: Log warning if stock went to 0
            IF v_new_stock = 0 THEN
                RAISE WARNING 'Product % went out of stock after order %', v_item.product_id, p_order_id;
            END IF;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure permissions are still granted
GRANT EXECUTE ON FUNCTION confirm_order_and_reduce_stock(uuid, text) TO authenticated;