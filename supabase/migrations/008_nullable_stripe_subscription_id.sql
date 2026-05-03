-- Allow manual subscriptions (cash, family, etc.) without a Stripe subscription
ALTER TABLE subscriptions ALTER COLUMN stripe_subscription_id DROP NOT NULL;
