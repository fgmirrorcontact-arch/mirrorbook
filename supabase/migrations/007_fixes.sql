-- Ensure service_commitment_tiers table exists (created in 006 but may not have been applied)
CREATE TABLE IF NOT EXISTS service_commitment_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  commitment_months INT NOT NULL,
  price_cents INT NOT NULL,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service_id, commitment_months)
);

-- Missing DELETE policy on employees table
CREATE POLICY IF NOT EXISTS "employees_delete_admin" ON employees
  FOR DELETE USING (is_admin());
