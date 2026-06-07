-- supabase/migrations/008_notifications.sql

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('order_status', 'new_order', 'new_comment')),
  title       text        NOT NULL,
  body        text        NOT NULL,
  order_id    uuid        REFERENCES public.orders(id) ON DELETE CASCADE,
  comment_id  uuid        REFERENCES public.comments(id) ON DELETE CASCADE,
  read        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read admin notifications"
  ON public.notifications FOR SELECT
  USING (
    user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update admin notifications"
  ON public.notifications FOR UPDATE
  USING (
    user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type       ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read       ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price      numeric(10,2) DEFAULT 0 CHECK (cost_price >= 0),
  ADD COLUMN IF NOT EXISTS delivery_charge numeric(10,2) DEFAULT 0 CHECK (delivery_charge >= 0);

CREATE TABLE IF NOT EXISTS public.product_expenses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid        REFERENCES public.products(id) ON DELETE CASCADE,
  label       text        NOT NULL,
  amount      numeric(10,2) NOT NULL CHECK (amount >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage expenses"
  ON public.product_expenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );