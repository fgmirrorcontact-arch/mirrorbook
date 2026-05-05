import Stripe from 'stripe'

const isTest = process.env.STRIPE_MODE === 'test'

export const stripeSecretKey = isTest
  ? process.env.STRIPE_SECRET_KEY_TEST!
  : process.env.STRIPE_SECRET_KEY_LIVE ?? process.env.STRIPE_SECRET_KEY!

export const stripePublishableKey = isTest
  ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST!
  : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!

export const stripeWebhookSecret = isTest
  ? process.env.STRIPE_WEBHOOK_SECRET_TEST!
  : process.env.STRIPE_WEBHOOK_SECRET_LIVE ?? process.env.STRIPE_WEBHOOK_SECRET!

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-04-22.dahlia',
})
