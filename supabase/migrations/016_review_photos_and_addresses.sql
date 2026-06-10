-- supabase/migrations/016_review_photos_and_addresses.sql
-- Adds support for photo reviews (images array in comments) and a robust multiple-address 
-- system with Bangladesh location hierarchy (Division, Zilla, Upazilla) and delivery instructions.

-- 1. Add images array to comments table for photo reviews
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

-- 2. Create the addresses table for multiple saved addresses
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  division text NOT NULL,
  zilla text NOT NULL,
  upazilla text NOT NULL,
  detailed_address text NOT NULL,
  delivery_instructions text,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can read own addresses"
  ON public.addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS trigger AS $$
BEGIN
  -- If the new/updated row is set to default, unset any other default for this user
  IF NEW.is_default = true THEN
    UPDATE public.addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  -- If a user is inserting their first address, make it default automatically
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.addresses WHERE user_id = NEW.user_id AND id != NEW.id
    ) THEN
      NEW.is_default = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach the trigger for default address management
DROP TRIGGER IF EXISTS trg_ensure_single_default_address ON public.addresses;
CREATE TRIGGER trg_ensure_single_default_address
  BEFORE INSERT OR UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_address();

-- 7. Add updated_at trigger for the addresses table
CREATE OR REPLACE FUNCTION public.handle_address_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS addresses_updated_at ON public.addresses;
CREATE TRIGGER addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_address_updated_at();