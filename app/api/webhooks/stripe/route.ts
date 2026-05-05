import { type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { stripe, stripeWebhookSecret } from '@/lib/stripe'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent } from '@/lib/google-calendar'
import { sendEmail } from '@/lib/email'
import {
  bookingConfirmedEmail,
  subscriptionActivatedEmail,
  tokensRenewedEmail,
} from '@/lib/emails/templates'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret)
  } catch (err) {
    console.error('[webhook] signature invalide', err)
    return Response.json({ error: 'Signature invalide' }, { status: 400 })
  }

  const admin = getSupabaseAdminClient()

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.metadata?.type === 'subscription_initial') {
          // Single payment covering first month + add-ons, then subscription created via API
          const { booking_id, stripe_price_id, service_id, stripe_coupon_id } = session.metadata

          // Confirm the booking
          await admin
            .from('bookings')
            .update({
              status: 'confirmed',
              stripe_payment_intent_id: (session.payment_intent as string | null) ?? null,
            })
            .eq('id', booking_id)

          // Fetch booking details for email + calendar
          const { data: booking } = await admin
            .from('bookings')
            .select('booking_ref, start_at, end_at, notes, client_id, services(name), employees(google_calendar_id)')
            .eq('id', booking_id)
            .single()

          if (!booking) break

          // Get the saved payment method from the PaymentIntent
          let paymentMethodId: string | undefined
          if (session.payment_intent) {
            const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string)
            const pm = pi.payment_method
            paymentMethodId = typeof pm === 'string' ? pm : pm?.id
          }

          // Create Stripe subscription — trial_end = 30 days so first auto-charge is next month
          const trialEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
          const stripeSub = await stripe.subscriptions.create({
            customer: session.customer as string,
            items: [{ price: stripe_price_id }],
            ...(paymentMethodId ? { default_payment_method: paymentMethodId } : {}),
            trial_end: trialEnd,
            // Apply promo coupon to all future invoices
            ...(stripe_coupon_id ? { discounts: [{ coupon: stripe_coupon_id }] } : {}),
            metadata: {
              supabase_user_id: booking.client_id,
              supabase_service_id: service_id,
            },
          } as Parameters<typeof stripe.subscriptions.create>[0])

          await upsertSubscription(admin, stripeSub)

          // Issue tokens for month 1 — first one marked used (for the booking just created)
          const { data: localSub } = await admin
            .from('subscriptions')
            .select('id, services(name, tokens_per_renewal)')
            .eq('stripe_subscription_id', stripeSub.id)
            .single()

          if (localSub) {
            const svcInfo = localSub.services as unknown as { name: string; tokens_per_renewal: number | null } | null
            const tokensPerRenewal = svcInfo?.tokens_per_renewal ?? 0
            const serviceName = svcInfo?.name ?? 'Formule'

            if (tokensPerRenewal > 0) {
              const tokenRows = Array.from({ length: tokensPerRenewal }, (_, i) => ({
                subscription_id: localSub.id,
                client_id: booking.client_id,
                service_id,
                stripe_invoice_id: session.invoice as string | null ?? null,
                status: i === 0 ? 'used' as const : 'available' as const,
              }))
              const { data: createdTokens } = await admin
                .from('subscription_tokens')
                .insert(tokenRows)
                .select('id')
              // Link first token to the booking
              if (createdTokens?.[0]) {
                await admin
                  .from('bookings')
                  .update({ token_id: createdTokens[0].id })
                  .eq('id', booking_id)
              }
            }

            // Send Stripe invoice
            if (session.invoice) {
              void stripe.invoices.sendInvoice(session.invoice as string).catch((err) =>
                console.error('[webhook] invoice send error', err)
              )
            }

            // Emails
            const { data: { user: clientUser } } = await admin.auth.admin.getUserById(booking.client_id)
            if (clientUser?.email) {
              const { data: profile } = await admin
                .from('profiles').select('full_name').eq('id', booking.client_id).single()
              const firstName = profile?.full_name?.split(' ')[0] ?? 'vous'
              const svcName = (booking.services as unknown as { name: string } | null)?.name ?? serviceName

              void sendEmail(
                clientUser.email,
                `Réservation confirmée — ${booking.booking_ref}`,
                bookingConfirmedEmail({
                  firstName,
                  bookingRef: booking.booking_ref,
                  serviceName: svcName,
                  startAt: booking.start_at,
                  endAt: booking.end_at,
                  totalCents: 0,
                  paymentMethod: 'stripe_one_time',
                })
              )
              void sendEmail(
                clientUser.email,
                `Votre abonnement ${serviceName} est actif !`,
                subscriptionActivatedEmail({
                  firstName,
                  serviceName,
                  tokensCount: tokensPerRenewal,
                  periodEnd: new Date(trialEnd * 1000).toISOString(),
                })
              )
            }

            // Google Calendar event
            const calendarId =
              (booking.employees as unknown as { google_calendar_id: string | null } | null)?.google_calendar_id
              ?? process.env.GOOGLE_CALENDAR_ID
              ?? ''
            const calServiceName = (booking.services as unknown as { name: string } | null)?.name ?? 'Réservation'
            const { data: calProfile } = await admin
              .from('profiles').select('full_name').eq('id', booking.client_id).single()

            if (calendarId) {
              createCalendarEvent({
                calendarId,
                summary: `${calServiceName} — ${calProfile?.full_name ?? 'Client'}`,
                description: `Réf : ${booking.booking_ref}${booking.notes ? `\n${booking.notes}` : ''}`,
                startAt: booking.start_at,
                endAt: booking.end_at,
              }).then((eventId) => {
                if (eventId) {
                  admin.from('bookings').update({ google_calendar_event_id: eventId }).eq('id', booking_id)
                }
              })
            }
          }

        } else if (session.mode === 'payment' && session.metadata?.booking_id) {
          const bookingId = session.metadata.booking_id
          await admin
            .from('bookings')
            .update({
              status: 'confirmed',
              stripe_payment_intent_id: (session.payment_intent as string | null) ?? null,
            })
            .eq('id', bookingId)

          if (session.metadata.token_id) {
            await admin
              .from('subscription_tokens')
              .update({ status: 'used' })
              .eq('id', session.metadata.token_id)
          }

          if (session.invoice) {
            void stripe.invoices.sendInvoice(session.invoice as string).catch((err) =>
              console.error('[webhook] invoice send error', err)
            )
          }

          const { data: booking } = await admin
            .from('bookings')
            .select('booking_ref, start_at, end_at, notes, client_id, services(name), employees(google_calendar_id)')
            .eq('id', bookingId)
            .single()

          if (booking) {
            const { data: clientProfile } = await admin
              .from('profiles')
              .select('full_name')
              .eq('id', booking.client_id)
              .single()

            const { data: { user: clientUser } } = await admin.auth.admin.getUserById(booking.client_id)
            if (clientUser?.email) {
              const firstName = clientProfile?.full_name?.split(' ')[0] ?? 'vous'
              const svcName = (booking.services as unknown as { name: string } | null)?.name ?? 'Prestation'
              void sendEmail(
                clientUser.email,
                `Réservation confirmée — ${booking.booking_ref}`,
                bookingConfirmedEmail({
                  firstName,
                  bookingRef: booking.booking_ref,
                  serviceName: svcName,
                  startAt: booking.start_at,
                  endAt: booking.end_at,
                  totalCents: 0,
                  paymentMethod: 'stripe_one_time',
                })
              )
            }

            const calendarId =
              (booking.employees as unknown as { google_calendar_id: string | null } | null)?.google_calendar_id
              ?? process.env.GOOGLE_CALENDAR_ID
              ?? ''
            const serviceName = (booking.services as unknown as { name: string } | null)?.name ?? 'Réservation'

            if (calendarId) {
              createCalendarEvent({
                calendarId,
                summary: `${serviceName} — ${clientProfile?.full_name ?? 'Client'}`,
                description: `Réf : ${booking.booking_ref}${booking.notes ? `\n${booking.notes}` : ''}`,
                startAt: booking.start_at,
                endAt: booking.end_at,
              }).then((eventId) => {
                if (eventId) {
                  admin.from('bookings').update({ google_calendar_event_id: eventId }).eq('id', bookingId)
                }
              })
            }
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await upsertSubscription(admin, sub)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await admin
          .from('subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        // Skip $0 trial invoices — tokens for month 1 are issued in checkout.session.completed
        if ((invoice.amount_paid ?? 0) === 0) break

        const subId = (invoice.parent?.subscription_details?.subscription ?? null) as string | null
        if (!subId) break

        const { data: localSub } = await admin
          .from('subscriptions')
          .select('id, client_id, service_id, current_period_end, services(name, tokens_per_renewal)')
          .eq('stripe_subscription_id', subId)
          .single()

        if (!localSub) break

        const svcInfo = localSub.services as unknown as { name: string; tokens_per_renewal: number | null } | null
        const tokensPerRenewal = svcInfo?.tokens_per_renewal ?? 0
        const serviceName = svcInfo?.name ?? 'Formule'

        if (tokensPerRenewal > 0) {
          await admin.from('subscription_tokens').insert(
            Array.from({ length: tokensPerRenewal }, () => ({
              subscription_id: localSub.id,
              client_id: localSub.client_id,
              service_id: localSub.service_id,
              stripe_invoice_id: invoice.id,
              status: 'available' as const,
            }))
          )
        }

        await admin
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('stripe_subscription_id', subId)

        void stripe.invoices.sendInvoice(invoice.id).catch((err) =>
          console.error('[webhook] invoice send error', err)
        )

        const { data: { user: subUser } } = await admin.auth.admin.getUserById(localSub.client_id)
        if (subUser?.email) {
          const { data: subProfile } = await admin
            .from('profiles').select('full_name').eq('id', localSub.client_id).single()
          const firstName = subProfile?.full_name?.split(' ')[0] ?? 'vous'
          const periodEnd = localSub.current_period_end ?? new Date().toISOString()

          void sendEmail(
            subUser.email,
            `Vos crédits ont été renouvelés — ${serviceName}`,
            tokensRenewedEmail({ firstName, serviceName, tokensCount: tokensPerRenewal, periodEnd })
          )
        }

        break
      }

      case 'invoice.payment_failed':
      case 'invoice.payment_action_required': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = (invoice.parent?.subscription_details?.subscription ?? null) as string | null
        if (!subId) break
        await admin
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subId)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        if (charge.payment_intent) {
          await admin
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('stripe_payment_intent_id', charge.payment_intent as string)
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error(`[webhook] erreur sur ${event.type}`, err)
    return Response.json({ error: 'Erreur interne' }, { status: 500 })
  }

  return Response.json({ received: true })
}

async function upsertSubscription(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  sub: Stripe.Subscription
) {
  const customerId = sub.customer as string

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.warn('[webhook] profile introuvable pour customer', customerId)
    return
  }

  const priceId = sub.items.data[0]?.price?.id

  // Prefer metadata service ID (handles tier price IDs that don't map directly to services)
  const serviceIdFromMeta = (sub.metadata as Record<string, string> | null)?.supabase_service_id
  let serviceId: string | null = serviceIdFromMeta ?? null

  if (!serviceId && priceId) {
    // Try direct service match
    const { data: service } = await admin
      .from('services')
      .select('id')
      .eq('stripe_price_id', priceId)
      .single()
    if (service) {
      serviceId = service.id
    } else {
      // Try via commitment tier
      const { data: tier } = await admin
        .from('service_commitment_tiers')
        .select('service_id')
        .eq('stripe_price_id', priceId)
        .single()
      if (tier) serviceId = tier.service_id
    }
  }

  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    paused: 'paused',
    incomplete: 'incomplete',
    incomplete_expired: 'cancelled',
    trialing: 'active',
    unpaid: 'past_due',
  }

  const item = sub.items.data[0]
  const periodStart = (item as unknown as { current_period_start?: number })?.current_period_start
    ?? (sub as unknown as { current_period_start: number }).current_period_start
  const periodEnd = (item as unknown as { current_period_end?: number })?.current_period_end
    ?? (sub as unknown as { current_period_end: number }).current_period_end

  await admin.from('subscriptions').upsert(
    {
      client_id: profile.id,
      service_id: serviceId as string,
      stripe_subscription_id: sub.id,
      status: (statusMap[sub.status] ?? 'incomplete') as never,
      current_period_start: new Date(periodStart * 1000).toISOString(),
      current_period_end: new Date(periodEnd * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
    },
    { onConflict: 'stripe_subscription_id' }
  )
}
