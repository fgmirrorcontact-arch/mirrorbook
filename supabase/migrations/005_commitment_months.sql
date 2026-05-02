-- Add commitment_months to services (null = sans engagement, 3 = 3 mois, 6 = 6 mois)
ALTER TABLE services ADD COLUMN IF NOT EXISTS commitment_months INT NULL;
