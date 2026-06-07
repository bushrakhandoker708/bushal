-- supabase/migrations/007_atomic_order_creation.sql

CREATE OR REPLACE FUNCTION public.create_order_with_stock_check(
  p_user_id      uuid,
  p_items        jsonb,
  p_total        numeric,
  p_bkash_invoice text
)
RETURNS uuid AS $$
DECLARE
  v_order_id   uuid;
  v_item       jsonb;
  v_stock      integer;
  v_product_id uuid;
  v_quantity   int;
  v_unit_price numeric;
BEGIN
  INSERT INTO public.orders (
    user_id, total, status, bkash_invoice, delivery_status, delivery_steps
  )
  VALUES (
    p_user_id, p_total, 'pending', p_bkash_invoice, 'order_placed', '[]'::jsonb
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity   := (v_item->>'quantity')::int;
    v_unit_price := (v_item->>'unit_price')::numeric;

    SELECT stock_quantity INTO v_stock
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'product_not_found:%', v_product_id;
    END IF;

    IF v_stock < v_quantity THEN
      RAISE EXCEPTION 'insufficient_stock:%', v_product_id;
    END IF;

    UPDATE public.products
    SET stock_quantity = stock_quantity - v_quantity
    WHERE id = v_product_id;

    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    VALUES (v_order_id, v_product_id, v_quantity, v_unit_price);
  END LOOP;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_order_with_stock_check(uuid, jsonb, numeric, text) TO authenticated;