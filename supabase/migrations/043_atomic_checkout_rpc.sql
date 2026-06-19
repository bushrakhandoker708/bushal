-- supabase/migrations/043_atomic_checkout_rpc.sql

-- ============================================================================
-- ATOMIC CHECKOUT RPC WITH ROW-LEVEL LOCKING
-- ============================================================================
-- This function replaces the previous create_order_with_stock_check to fix
-- race conditions that lead to overselling. It uses SELECT ... FOR UPDATE
-- to lock product rows during stock verification, ensuring that concurrent
-- orders cannot read stale stock quantities.
--
-- SECURITY: Uses SECURITY INVOKER to respect RLS policies of the caller.
-- The caller must have INSERT permissions on orders/order_items and
-- SELECT/UPDATE permissions on products (typically granted via RLS or role).

CREATE OR REPLACE FUNCTION public.create_order_with_stock_check(
    p_user_id uuid,
    p_items jsonb,
    p_total numeric,
    p_bkash_invoice text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order_id uuid;
    v_item jsonb;
    v_product_id uuid;
    v_quantity int;
    v_unit_price numeric;
    v_current_stock int;
    v_discount_percent int;
    v_effective_price numeric;
BEGIN
    -- Validate input
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'empty_cart';
    END IF;

    IF p_total < 0 THEN
        RAISE EXCEPTION 'invalid_total';
    END IF;

    -- Create the order header first
    INSERT INTO public.orders (
        user_id,
        total,
        status,
        bkash_invoice,
        delivery_status,
        delivery_steps,
        inventory_reduced
    ) VALUES (
        p_user_id,
        p_total,
        'pending',
        COALESCE(p_bkash_invoice, ''),
        'order_placed',
        '[]'::jsonb,
        false
    ) RETURNING id INTO v_order_id;

    -- Process each item atomically with row-level locking
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_quantity := (v_item->>'quantity')::int;
        v_unit_price := (v_item->>'unit_price')::numeric;

        -- Validate quantity
        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'invalid_quantity for product %', v_product_id;
        END IF;

        -- LOCK THE ROW: This prevents other transactions from reading/modifying
        -- this product's stock until our transaction commits or rolls back.
        -- This is the critical fix for the overselling race condition.
        SELECT stock_quantity, discount_percent
        INTO v_current_stock, v_discount_percent
        FROM public.products
        WHERE id = v_product_id
          AND is_deleted = false
        FOR UPDATE;

        -- Check if product exists
        IF v_current_stock IS NULL THEN
            -- Rollback the entire transaction including the order header
            RAISE EXCEPTION 'product_not_found: %', v_product_id;
        END IF;

        -- Check stock availability
        IF v_current_stock < v_quantity THEN
            RAISE EXCEPTION 'insufficient_stock: product % has % available but % requested',
                v_product_id, v_current_stock, v_quantity;
        END IF;

        -- Verify price integrity (prevent client-side price tampering)
        -- Recalculate effective price server-side using DB values
        v_effective_price := CASE
            WHEN v_discount_percent > 0 THEN
                ROUND((SELECT price FROM public.products WHERE id = v_product_id) *
                      (1 - v_discount_percent / 100.0), 2)
            ELSE
                (SELECT price FROM public.products WHERE id = v_product_id)
        END;

        -- Allow small floating point tolerance (±0.01)
        IF ABS(v_unit_price - v_effective_price) > 0.01 THEN
            RAISE EXCEPTION 'price_mismatch: expected % but got % for product %',
                v_effective_price, v_unit_price, v_product_id;
        END IF;

        -- ATOMIC STOCK DECREMENT: Since we hold the row lock from FOR UPDATE,
        -- this update is safe from concurrent modifications.
        UPDATE public.products
        SET stock_quantity = stock_quantity - v_quantity,
            in_stock = (stock_quantity - v_quantity) > 0,
            updated_at = now()
        WHERE id = v_product_id;

        -- Insert order item
        INSERT INTO public.order_items (
            order_id,
            product_id,
            quantity,
            unit_price
        ) VALUES (
            v_order_id,
            v_product_id,
            v_quantity,
            v_unit_price
        );
    END LOOP;

    -- Mark inventory as reduced atomically within the same transaction
    UPDATE public.orders
    SET inventory_reduced = true
    WHERE id = v_order_id;

    RETURN v_order_id;

EXCEPTION
    WHEN raise_exception THEN
        -- Re-raise known business logic exceptions
        RAISE;
    WHEN OTHERS THEN
        -- Log unexpected errors and re-raise
        RAISE EXCEPTION 'order_creation_failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_order_with_stock_check(uuid, jsonb, numeric, text) TO authenticated;

-- Revoke from anon to prevent unauthenticated order creation
REVOKE ALL ON FUNCTION public.create_order_with_stock_check(uuid, jsonb, numeric, text) FROM anon;