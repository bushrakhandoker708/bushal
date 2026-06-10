-- supabase/migrations/017_add_phone_to_orders.sql
-- Adds a 'phone' column to the orders table to snapshot the customer's 
-- contact number at the time of checkout. This ensures delivery agents 
-- always have the correct number, even if the user updates their profile later.

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS phone text;

-- Add a comment to clarify the purpose of the column
COMMENT ON COLUMN public.orders.phone IS 'Customer phone number at the time of checkout for delivery purposes';