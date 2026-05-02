-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enum Types ───────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('client', 'admin', 'employee'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('stripe_one_time', 'subscription_token'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'paused', 'incomplete'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE token_status AS ENUM ('available', 'used', 'expired'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_cents'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── Tables ───────────────────────────────────────────────────────────────────

-- profiles: mirrors auth.users, extended with app-specific fields
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text,
  phone           text,
  role            user_role NOT NULL DEFAULT 'client',
  stripe_customer_id text,
  avatar_url      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- employees: staff members that perform detailing
CREATE TABLE employees (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name        text NOT NULL,
  google_calendar_id  text,
  color               text NOT NULL DEFAULT '#6366f1',
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- services: detailing packages offered
CREATE TABLE services (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                text NOT NULL,
  description         text,
  price_cents         integer NOT NULL,
  duration_minutes    integer NOT NULL,
  category            text,
  stripe_price_id     text,
  is_subscription     boolean NOT NULL DEFAULT false,
  stripe_sub_price_id text,
  tokens_per_renewal  integer,
  image_url           text,
  is_active           boolean NOT NULL DEFAULT true,
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- service_addons: optional add-ons that can be attached to bookings
CREATE TABLE service_addons (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              text NOT NULL,
  description       text,
  price_cents       integer NOT NULL,
  duration_minutes  integer NOT NULL DEFAULT 0,
  applicable_to     uuid[] NOT NULL DEFAULT '{}',
  is_active         boolean NOT NULL DEFAULT true,
  sort_order        integer NOT NULL DEFAULT 0
);

-- availability_schedules: recurring weekly schedule per employee
CREATE TABLE availability_schedules (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id             uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week             integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time              time NOT NULL,
  end_time                time NOT NULL,
  slot_duration_minutes   integer NOT NULL DEFAULT 30,
  break_minutes           integer NOT NULL DEFAULT 0,
  is_active               boolean NOT NULL DEFAULT true
);

-- availability_exceptions: overrides for specific dates (holidays, special hours)
CREATE TABLE availability_exceptions (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  exception_date  date NOT NULL,
  is_unavailable  boolean NOT NULL DEFAULT true,
  custom_start    time,
  custom_end      time,
  reason          text
);

-- promo_codes: discount codes
CREATE TABLE promo_codes (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                    text NOT NULL UNIQUE,
  description             text,
  discount_type           discount_type NOT NULL,
  discount_value          numeric(10, 2) NOT NULL,
  min_purchase_cents      integer,
  max_uses                integer,
  uses_count              integer NOT NULL DEFAULT 0,
  applicable_service_ids  uuid[],
  valid_from              timestamptz,
  valid_until             timestamptz,
  is_active               boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- bookings: individual appointment records
CREATE TABLE bookings (
  id                        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_ref               text NOT NULL UNIQUE,
  client_id                 uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  employee_id               uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  service_id                uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  start_at                  timestamptz NOT NULL,
  end_at                    timestamptz NOT NULL,
  status                    booking_status NOT NULL DEFAULT 'pending',
  payment_method            payment_method NOT NULL DEFAULT 'stripe_one_time',
  stripe_payment_intent_id  text,
  token_id                  uuid,
  total_price_cents         integer NOT NULL,
  discount_cents            integer NOT NULL DEFAULT 0,
  promo_code_id             uuid REFERENCES promo_codes(id) ON DELETE SET NULL,
  notes                     text,
  internal_notes            text,
  google_calendar_event_id  text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  cancelled_at              timestamptz,
  cancellation_reason       text
);

-- booking_addons: add-ons selected for a booking
CREATE TABLE booking_addons (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id    uuid NOT NULL REFERENCES service_addons(id) ON DELETE RESTRICT,
  price_cents integer NOT NULL
);

-- subscriptions: recurring Stripe subscriptions
CREATE TABLE subscriptions (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  service_id              uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  stripe_subscription_id  text NOT NULL UNIQUE,
  status                  subscription_status NOT NULL DEFAULT 'incomplete',
  current_period_start    timestamptz NOT NULL,
  current_period_end      timestamptz NOT NULL,
  cancel_at_period_end    boolean NOT NULL DEFAULT false,
  cancelled_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- subscription_tokens: usage tokens issued per subscription renewal
CREATE TABLE subscription_tokens (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  service_id      uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  status          token_status NOT NULL DEFAULT 'available',
  stripe_invoice_id text,
  issued_at       timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,
  used_at         timestamptz,
  booking_id      uuid REFERENCES bookings(id) ON DELETE SET NULL
);

-- Add FK from bookings.token_id to subscription_tokens (after both tables exist)
ALTER TABLE bookings
  ADD CONSTRAINT bookings_token_id_fkey
  FOREIGN KEY (token_id) REFERENCES subscription_tokens(id) ON DELETE SET NULL;

-- invoices: billing records
CREATE TABLE invoices (
  id                        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number            text NOT NULL UNIQUE,
  client_id                 uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  booking_id                uuid REFERENCES bookings(id) ON DELETE SET NULL,
  subscription_id           uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_payment_intent_id  text,
  stripe_invoice_id         text,
  amount_cents              integer NOT NULL,
  tax_cents                 integer NOT NULL DEFAULT 0,
  pdf_storage_path          text,
  sent_at                   timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- promo_code_uses: audit trail for promo code usage
CREATE TABLE promo_code_uses (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id         uuid NOT NULL REFERENCES promo_codes(id) ON DELETE RESTRICT,
  client_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  booking_id            uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  discount_applied_cents integer NOT NULL,
  used_at               timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_employee_id ON bookings(employee_id);
CREATE INDEX idx_bookings_start_at ON bookings(start_at);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_availability_schedules_employee ON availability_schedules(employee_id, day_of_week);
CREATE INDEX idx_availability_exceptions_employee_date ON availability_exceptions(employee_id, exception_date);
CREATE INDEX idx_subscription_tokens_client ON subscription_tokens(client_id, status);
CREATE INDEX idx_subscriptions_client ON subscriptions(client_id);

-- ─── Booking Reference Generator ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_booking_ref() RETURNS text AS $$
DECLARE
  year_part text;
  seq_part  text;
  new_ref   text;
  counter   integer := 0;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  LOOP
    -- 4 random uppercase alphanumeric characters
    seq_part := UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 4));
    new_ref := 'BK-' || year_part || '-' || seq_part;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM bookings WHERE booking_ref = new_ref);
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Could not generate unique booking_ref after 100 attempts';
    END IF;
  END LOOP;
  RETURN new_ref;
END;
$$ LANGUAGE plpgsql;

-- ─── Auto-create Profile on Signup ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'client'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: check if current user is employee
CREATE OR REPLACE FUNCTION is_employee() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'employee')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- profiles policies
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_self" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- services: public read, admin write
CREATE POLICY "services_select_public" ON services
  FOR SELECT USING (true);

CREATE POLICY "services_insert_admin" ON services
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "services_update_admin" ON services
  FOR UPDATE USING (is_admin());

CREATE POLICY "services_delete_admin" ON services
  FOR DELETE USING (is_admin());

-- service_addons: public read, admin write
CREATE POLICY "service_addons_select_public" ON service_addons
  FOR SELECT USING (true);

CREATE POLICY "service_addons_insert_admin" ON service_addons
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "service_addons_update_admin" ON service_addons
  FOR UPDATE USING (is_admin());

CREATE POLICY "service_addons_delete_admin" ON service_addons
  FOR DELETE USING (is_admin());

-- employees: public read (for booking wizard), admin write
CREATE POLICY "employees_select_public" ON employees
  FOR SELECT USING (true);

CREATE POLICY "employees_insert_admin" ON employees
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "employees_update_admin" ON employees
  FOR UPDATE USING (is_admin());

-- availability: public read
CREATE POLICY "availability_schedules_select_public" ON availability_schedules
  FOR SELECT USING (true);

CREATE POLICY "availability_schedules_write_admin" ON availability_schedules
  FOR ALL USING (is_admin());

CREATE POLICY "availability_exceptions_select_public" ON availability_exceptions
  FOR SELECT USING (true);

CREATE POLICY "availability_exceptions_write_admin" ON availability_exceptions
  FOR ALL USING (is_admin());

-- promo_codes: admin only
CREATE POLICY "promo_codes_select_admin" ON promo_codes
  FOR SELECT USING (is_admin());

CREATE POLICY "promo_codes_write_admin" ON promo_codes
  FOR ALL USING (is_admin());

-- bookings: client sees own, admin sees all, employee sees assigned
CREATE POLICY "bookings_select_client" ON bookings
  FOR SELECT USING (
    auth.uid() = client_id
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = bookings.employee_id AND e.profile_id = auth.uid()
    )
  );

CREATE POLICY "bookings_insert_authenticated" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id OR is_admin());

CREATE POLICY "bookings_update_admin_or_own" ON bookings
  FOR UPDATE USING (
    is_admin()
    OR (auth.uid() = client_id AND status IN ('pending', 'confirmed'))
  );

-- booking_addons: follow booking access
CREATE POLICY "booking_addons_select" ON booking_addons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_addons.booking_id
        AND (b.client_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "booking_addons_insert" ON booking_addons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_addons.booking_id
        AND (b.client_id = auth.uid() OR is_admin())
    )
  );

-- subscriptions: client sees own, admin sees all
CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT USING (auth.uid() = client_id OR is_admin());

CREATE POLICY "subscriptions_write_admin" ON subscriptions
  FOR ALL USING (is_admin());

-- subscription_tokens: client sees own
CREATE POLICY "subscription_tokens_select" ON subscription_tokens
  FOR SELECT USING (auth.uid() = client_id OR is_admin());

CREATE POLICY "subscription_tokens_write_admin" ON subscription_tokens
  FOR ALL USING (is_admin());

-- invoices: client sees own
CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (auth.uid() = client_id OR is_admin());

-- promo_code_uses: admin only
CREATE POLICY "promo_code_uses_select_admin" ON promo_code_uses
  FOR SELECT USING (is_admin());

-- ─── Seed Data ────────────────────────────────────────────────────────────────

-- Insert services
INSERT INTO services (id, name, description, price_cents, duration_minutes, category, is_subscription, is_active, sort_order)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'Lavage Extérieur',
    'Lavage complet de la carrosserie, des jantes et des vitres. Inclut le séchage à la main pour un résultat impeccable.',
    2900,
    45,
    'Extérieur',
    false,
    true,
    1
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'Lavage Intérieur & Extérieur',
    'Nettoyage complet intérieur et extérieur : aspiration, nettoyage des plastiques, vitres, carrosserie et jantes.',
    5900,
    90,
    'Complet',
    false,
    true,
    2
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'Abonnement Mensuel — Essentiel',
    'Un lavage extérieur par semaine. Idéal pour garder votre véhicule propre toute l''année.',
    4900,
    45,
    'Abonnement',
    true,
    true,
    3
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    'Abonnement Mensuel — Premium',
    'Un lavage complet intérieur et extérieur par semaine, avec traitement hydrofuge mensuel offert.',
    9900,
    90,
    'Abonnement',
    true,
    true,
    4
  );

-- Insert service add-ons
INSERT INTO service_addons (id, name, description, price_cents, duration_minutes, applicable_to, is_active, sort_order)
VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'Traitement Hydrofuge',
    'Application d''un traitement hydrofuge longue durée sur la carrosserie (protection 3 mois).',
    1500,
    15,
    ARRAY[
      'a1000000-0000-0000-0000-000000000001'::uuid,
      'a1000000-0000-0000-0000-000000000002'::uuid
    ],
    true,
    1
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'Nettoyage du Coffre',
    'Aspiration et nettoyage complet du coffre, y compris le plancher amovible.',
    800,
    10,
    ARRAY[
      'a1000000-0000-0000-0000-000000000002'::uuid
    ],
    true,
    2
  ),
  (
    'b1000000-0000-0000-0000-000000000003',
    'Désodorisation Ozone',
    'Traitement à l''ozone pour éliminer les mauvaises odeurs en profondeur.',
    1200,
    20,
    ARRAY[
      'a1000000-0000-0000-0000-000000000001'::uuid,
      'a1000000-0000-0000-0000-000000000002'::uuid
    ],
    true,
    3
  );

-- Note: To add the admin employee and their schedule, you must first create a user
-- in Supabase Auth, then run the following (replace the UUID with the actual user ID):
--
-- INSERT INTO profiles (id, full_name, role)
-- VALUES ('<auth-user-uuid>', 'Thomas Dubois', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Thomas Dubois';
--
-- INSERT INTO employees (id, profile_id, display_name, color)
-- VALUES (
--   'c1000000-0000-0000-0000-000000000001',
--   '<auth-user-uuid>',
--   'Thomas',
--   '#6366f1'
-- );
--
-- -- Weekly schedule Mon-Fri 09:00-18:00, 30-min slots
-- INSERT INTO availability_schedules (employee_id, day_of_week, start_time, end_time, slot_duration_minutes, break_minutes, is_active)
-- VALUES
--   ('c1000000-0000-0000-0000-000000000001', 1, '09:00', '18:00', 30, 0, true),
--   ('c1000000-0000-0000-0000-000000000001', 2, '09:00', '18:00', 30, 0, true),
--   ('c1000000-0000-0000-0000-000000000001', 3, '09:00', '18:00', 30, 0, true),
--   ('c1000000-0000-0000-0000-000000000001', 4, '09:00', '18:00', 30, 0, true),
--   ('c1000000-0000-0000-0000-000000000001', 5, '09:00', '18:00', 30, 0, true);
