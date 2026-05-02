CREATE TABLE IF NOT EXISTS service_commitment_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  commitment_months INT NOT NULL,
  price_cents INT NOT NULL,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service_id, commitment_months)
);
