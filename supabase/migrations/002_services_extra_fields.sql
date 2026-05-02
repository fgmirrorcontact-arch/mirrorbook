-- TVA applicable sur la prestation (ex: 20.0 = 20%)
ALTER TABLE services ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) NOT NULL DEFAULT 0;

-- Acompte requis à la réservation (ex: 30 = 30%, null = pas d'acompte)
ALTER TABLE services ADD COLUMN IF NOT EXISTS deposit_percent integer;

-- Délai minimum avant la réservation (en heures, 0 = pas de délai)
ALTER TABLE services ADD COLUMN IF NOT EXISTS min_lead_hours integer NOT NULL DEFAULT 0;

-- Délai maximum avant la réservation (en jours, null = pas de limite)
ALTER TABLE services ADD COLUMN IF NOT EXISTS max_lead_days integer;

-- Masquer la durée sur la page de réservation publique
ALTER TABLE services ADD COLUMN IF NOT EXISTS hide_duration boolean NOT NULL DEFAULT false;
