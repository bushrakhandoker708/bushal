-- Add delivery tracking columns on orders (if not exists)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'order_placed'
CHECK (delivery_status IN (
  'order_placed', 'confirmed', 'processing',
  'shipped', 'out_for_delivery', 'delivered', 'cancelled'
)),
ADD COLUMN IF NOT EXISTS delivery_steps jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Create function to update delivery status
CREATE OR REPLACE FUNCTION public.update_order_delivery(
  p_order_id uuid,
  p_status text,
  p_label text
)
RETURNS void AS $$
BEGIN
  UPDATE public.orders
  SET
    delivery_status = p_status,
    delivery_steps = delivery_steps || jsonb_build_object(
      'status', p_status,
      'label', p_label,
      'timestamp', now()::text
    ),
    updated_at = now()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_order_delivery(uuid, text, text) TO authenticated;

-- Backfill existing orders
UPDATE public.orders
SET delivery_status = CASE
  WHEN status = 'fulfilled' THEN 'delivered'
  WHEN status = 'cancelled' THEN 'cancelled'
  WHEN status = 'pending'   THEN 'order_placed'
  ELSE 'order_placed'
END
WHERE delivery_status = 'order_placed' OR delivery_status IS NULL;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON public.orders(delivery_status);