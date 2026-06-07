-- supabase/migrations/009_notification_triggers.sql

CREATE OR REPLACE FUNCTION notify_on_order_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, order_id)
  VALUES (
    NEW.user_id,
    'order_status',
    'Order placed',
    'Your order #' || upper(substr(NEW.id::text, 1, 8)) || ' has been received.',
    NEW.id
  );

  INSERT INTO public.notifications (user_id, type, title, body, order_id)
  VALUES (
    NULL,
    'new_order',
    'New order received',
    'Order #' || upper(substr(NEW.id::text, 1, 8)) || ' is waiting for confirmation.',
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION notify_on_order_insert();

CREATE OR REPLACE FUNCTION notify_on_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, order_id)
    VALUES (
      NEW.user_id,
      'order_status',
      'Order update',
      'Your order #' || upper(substr(NEW.id::text, 1, 8)) || ' is now: ' || NEW.status || '.',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_order_status_changed
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION notify_on_order_status_change();

CREATE OR REPLACE FUNCTION notify_on_comment_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, comment_id)
  VALUES (
    NULL,
    'new_comment',
    'New comment received',
    'A customer left a new review.',
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment_insert();