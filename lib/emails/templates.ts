import { APP_URL } from '@/lib/email'

// ─── Layout ───────────────────────────────────────────────────────────────────

function base(content: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#203727;padding:28px 40px;">
            <a href="${APP_URL}" style="text-decoration:none;display:inline-block;">
              <img src="${APP_URL}/logo.svg" alt="Mirrorbook" height="36" style="display:block;max-height:36px;width:auto;" />
            </a>
          </td>
        </tr>

        <!-- Content -->
        <tr><td style="padding:40px;">${content}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
              Mirrorbook — Nettoyage auto professionnel<br>
              <a href="${APP_URL}/dashboard" style="color:#203727;text-decoration:none;">Mon espace client</a>
              &nbsp;·&nbsp;
              <a href="${APP_URL}/book" style="color:#203727;text-decoration:none;">Réserver</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function btn(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#203727;color:#E0E704;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;margin-top:24px;">${label}</a>`
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;color:#6b7280;font-size:14px;width:40%;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${value}</td>
  </tr>`
}

function detailTable(rows: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:24px 0;background:#f9fafb;">
    <tbody>${rows}</tbody>
  </table>`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Europe/Paris',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })
}

function fmtPrice(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function welcomeEmail(firstName: string) {
  return base(`
    <h1 style="margin:0 0 8px;font-size:24px;color:#111827;">Bienvenue, ${firstName} ! 👋</h1>
    <p style="margin:0 0 16px;color:#6b7280;font-size:15px;line-height:1.6;">
      Votre compte Mirrorbook est activé. Vous pouvez dès maintenant réserver une prestation
      ou découvrir nos formules d'abonnement pour garder votre voiture impeccable tout au long de l'année.
    </p>
    <p style="margin:0;color:#6b7280;font-size:15px;line-height:1.6;">
      Réservez un créneau en moins de 2 minutes, à l'heure qui vous convient.
    </p>
    ${btn('Prendre rendez-vous', `${APP_URL}/book`)}
    <p style="margin:32px 0 0;color:#9ca3af;font-size:13px;">
      Vous pouvez aussi consulter <a href="${APP_URL}/formules" style="color:#203727;">nos formules d'abonnement</a>
      pour bénéficier de tarifs préférentiels.
    </p>
  `)
}

export function bookingConfirmedEmail(params: {
  firstName: string
  bookingRef: string
  serviceName: string
  startAt: string
  endAt: string
  totalCents: number
  paymentMethod: 'stripe_one_time' | 'subscription_token'
}) {
  const { firstName, bookingRef, serviceName, startAt, endAt, totalCents, paymentMethod } = params
  const priceDisplay = paymentMethod === 'subscription_token'
    ? 'Inclus dans votre abonnement'
    : fmtPrice(totalCents)

  return base(`
    <div style="display:inline-block;background:#dcfce7;color:#15803d;font-size:12px;font-weight:600;padding:4px 10px;border-radius:99px;margin-bottom:16px;">
      ✓ Réservation confirmée
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;color:#111827;">C'est reservé, ${firstName} !</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
      Votre réservation a bien été enregistrée. Retrouvez tous les détails ci-dessous.
    </p>
    ${detailTable(
      row('Référence', bookingRef) +
      row('Prestation', serviceName) +
      row('Date', fmtDate(startAt)) +
      row('Horaire', `${fmtTime(startAt)} – ${fmtTime(endAt)}`) +
      row('Montant', priceDisplay)
    )}
    ${btn('Voir ma réservation', `${APP_URL}/confirmation/${bookingRef}`)}
    <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">
      Besoin d'annuler ou de modifier ? Rendez-vous dans
      <a href="${APP_URL}/dashboard" style="color:#203727;">votre espace client</a>.
    </p>
  `)
}

export function bookingCancelledEmail(params: {
  firstName: string
  bookingRef: string
  serviceName: string
  startAt: string
}) {
  const { firstName, bookingRef, serviceName, startAt } = params
  return base(`
    <div style="display:inline-block;background:#fee2e2;color:#b91c1c;font-size:12px;font-weight:600;padding:4px 10px;border-radius:99px;margin-bottom:16px;">
      Réservation annulée
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;color:#111827;">Votre réservation a été annulée</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
      Bonjour ${firstName}, votre réservation a bien été annulée. Si vous avez été débité,
      le remboursement sera traité sous 5 à 10 jours ouvrés.
    </p>
    ${detailTable(
      row('Référence', bookingRef) +
      row('Prestation', serviceName) +
      row('Date annulée', fmtDate(startAt))
    )}
    ${btn('Faire une nouvelle réservation', `${APP_URL}/book`)}
  `)
}

export function subscriptionActivatedEmail(params: {
  firstName: string
  serviceName: string
  tokensCount: number
  periodEnd: string
}) {
  const { firstName, serviceName, tokensCount, periodEnd } = params
  return base(`
    <div style="display:inline-block;background:#ede9fe;color:#7c3aed;font-size:12px;font-weight:600;padding:4px 10px;border-radius:99px;margin-bottom:16px;">
      ✓ Abonnement actif
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;color:#111827;">Votre abonnement est actif, ${firstName} !</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
      Bienvenue dans la formule <strong>${serviceName}</strong>. Vos crédits de séances sont
      disponibles dès maintenant.
    </p>
    ${detailTable(
      row('Formule', serviceName) +
      row('Crédits disponibles', `${tokensCount} séance${tokensCount > 1 ? 's' : ''}`) +
      row('Prochain renouvellement', fmtDate(periodEnd))
    )}
    ${btn('Réserver ma première séance', `${APP_URL}/book`)}
  `)
}

export function bookingReminderEmail(params: {
  firstName: string
  bookingRef: string
  serviceName: string
  startAt: string
  endAt: string
}) {
  const { firstName, bookingRef, serviceName, startAt, endAt } = params
  return base(`
    <div style="display:inline-block;background:#fef9c3;color:#a16207;font-size:12px;font-weight:600;padding:4px 10px;border-radius:99px;margin-bottom:16px;">
      Rappel — demain
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;color:#111827;">C'est demain, ${firstName} !</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
      Votre rendez-vous est prévu <strong>demain</strong>. Retrouvez les détails ci-dessous.
    </p>
    ${detailTable(
      row('Référence', bookingRef) +
      row('Prestation', serviceName) +
      row('Date', fmtDate(startAt)) +
      row('Horaire', `${fmtTime(startAt)} – ${fmtTime(endAt)}`)
    )}
    <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">
      Besoin de modifier ou d'annuler ? Rendez-vous dans
      <a href="${APP_URL}/dashboard" style="color:#203727;">votre espace client</a>
      au moins 24h à l'avance.
    </p>
  `)
}

export function bookingRescheduledEmail(params: {
  firstName: string
  bookingRef: string
  serviceName: string
  newStartAt: string
  newEndAt: string
}) {
  const { firstName, bookingRef, serviceName, newStartAt, newEndAt } = params
  return base(`
    <div style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:12px;font-weight:600;padding:4px 10px;border-radius:99px;margin-bottom:16px;">
      Créneau modifié
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;color:#111827;">Votre créneau a été modifié</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
      Bonjour ${firstName}, votre réservation a bien été déplacée au nouveau créneau indiqué ci-dessous.
    </p>
    ${detailTable(
      row('Référence', bookingRef) +
      row('Prestation', serviceName) +
      row('Nouvelle date', fmtDate(newStartAt)) +
      row('Horaire', `${fmtTime(newStartAt)} – ${fmtTime(newEndAt)}`)
    )}
    ${btn('Voir ma réservation', `${APP_URL}/dashboard`)}
    <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">
      Besoin d'annuler ? Rendez-vous dans
      <a href="${APP_URL}/dashboard" style="color:#203727;">votre espace client</a>.
    </p>
  `)
}

export function tokensRenewedEmail(params: {
  firstName: string
  serviceName: string
  tokensCount: number
  periodEnd: string
}) {
  const { firstName, serviceName, tokensCount, periodEnd } = params
  return base(`
    <div style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:12px;font-weight:600;padding:4px 10px;border-radius:99px;margin-bottom:16px;">
      Crédits renouvelés
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;color:#111827;">Vos crédits ont été renouvelés !</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
      Bonjour ${firstName}, votre abonnement <strong>${serviceName}</strong> vient d'être renouvelé.
      ${tokensCount} nouvelle${tokensCount > 1 ? 's' : ''} séance${tokensCount > 1 ? 's' : ''}
      ${tokensCount > 1 ? 'sont disponibles' : 'est disponible'} dans votre espace.
    </p>
    ${detailTable(
      row('Formule', serviceName) +
      row('Nouveaux crédits', `${tokensCount} séance${tokensCount > 1 ? 's' : ''}`) +
      row('Prochain renouvellement', fmtDate(periodEnd))
    )}
    ${btn('Réserver ma séance', `${APP_URL}/book`)}
  `)
}
