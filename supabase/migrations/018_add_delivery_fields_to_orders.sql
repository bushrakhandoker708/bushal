-- supabase/migrations/018_add_delivery_fields_to_orders.sql
-- Adds essential delivery & contact columns to the orders table so the admin 
-- can view the exact phone number and address provided at checkout.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_address text,
ADD COLUMN IF NOT EXISTS customer_note text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cod';

-- Add comments for documentation
COMMENT ON COLUMN public.orders.delivery_address IS 'Full formatted delivery address from checkout';
COMMENT ON COLUMN public.orders.customer_note IS 'Optional delivery instructions from customer';
COMMENT ON COLUMN public.orders.phone IS 'Customer phone number at time of purchase';