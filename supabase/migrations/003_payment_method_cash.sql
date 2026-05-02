-- Add cash and card_present payment methods for admin manual bookings
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'cash';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'card_present';
