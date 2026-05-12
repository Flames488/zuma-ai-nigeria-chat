
-- =========================================================
-- 20260510_025: niche_configs
-- =========================================================
CREATE TABLE public.niche_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  niche_type TEXT NOT NULL CHECK (niche_type IN ('hospital','food')),
  active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, niche_type)
);

CREATE INDEX idx_niche_configs_business ON public.niche_configs(business_id);

ALTER TABLE public.niche_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own niche configs" ON public.niche_configs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = niche_configs.business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Owner can insert own niche configs" ON public.niche_configs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = niche_configs.business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Owner can update own niche configs" ON public.niche_configs
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = niche_configs.business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Owner can delete own niche configs" ON public.niche_configs
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = niche_configs.business_id AND b.owner_id = auth.uid()));

CREATE TRIGGER trg_niche_configs_updated_at
  BEFORE UPDATE ON public.niche_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 20260510_026: menu_items
-- =========================================================
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  price_kobo INTEGER NOT NULL CHECK (price_kobo >= 0),
  available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_items_business ON public.menu_items(business_id);
CREATE INDEX idx_menu_items_available ON public.menu_items(business_id, available);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own menu items" ON public.menu_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = menu_items.business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Owner can insert own menu items" ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = menu_items.business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Owner can update own menu items" ON public.menu_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = menu_items.business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Owner can delete own menu items" ON public.menu_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = menu_items.business_id AND b.owner_id = auth.uid()));

CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 20260510_027: food_orders
-- =========================================================
CREATE TABLE public.food_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_number TEXT NOT NULL,
  customer_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_kobo INTEGER NOT NULL DEFAULT 0,
  delivery_fee_kobo INTEGER NOT NULL DEFAULT 0,
  total_kobo INTEGER NOT NULL DEFAULT 0,
  delivery_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','preparing','out_for_delivery','delivered','cancelled')),
  paystack_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_orders_business ON public.food_orders(business_id);
CREATE INDEX idx_food_orders_status ON public.food_orders(business_id, status);
CREATE INDEX idx_food_orders_customer ON public.food_orders(business_id, customer_number);

ALTER TABLE public.food_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own food orders" ON public.food_orders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = food_orders.business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Owner can insert own food orders" ON public.food_orders
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = food_orders.business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Owner can update own food orders" ON public.food_orders
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = food_orders.business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Owner can delete own food orders" ON public.food_orders
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = food_orders.business_id AND b.owner_id = auth.uid()));

CREATE TRIGGER trg_food_orders_updated_at
  BEFORE UPDATE ON public.food_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
