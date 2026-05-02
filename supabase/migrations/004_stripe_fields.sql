-- stripe_price_id on services: links a service/formule to its Stripe Price object
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- stripe_payment_intent_id on bookings: links a one-time booking to its Stripe PaymentIntent
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- admin_notes on profiles (used by ClientDetailClient)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_notes text;
