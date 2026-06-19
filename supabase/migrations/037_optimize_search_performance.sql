-- supabase/migrations/037_optimize_search_performance.sql
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS popularity_score numeric DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_popularity ON public.products(popularity_score DESC);

-- Automatically increment popularity when an order is confirmed
CREATE OR REPLACE FUNCTION public.increment_product_popularity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    UPDATE public.products
    SET popularity_score = popularity_score + NEW.quantity
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_item_fulfilled_popularity ON public.order_items;
CREATE TRIGGER trg_order_item_fulfilled_popularity
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.increment_product_popularity();