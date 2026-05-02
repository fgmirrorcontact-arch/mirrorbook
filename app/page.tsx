import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { ServiceCard } from './(client)/formules/FormulesClient'
import { fetchGoogleReviews } from '@/lib/google-reviews'
import type { ServiceCommitmentTier } from '@/types'
import {
  Car,
  CalendarCheck,
  Sparkles,
  CreditCard,
  Star,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Timer,
} from 'lucide-react'

const GOOGLE_REVIEWS_URL = 'https://share.google/IeuPTUHBxH9qhNn6D'

const CONTACT = {
  address: '12 rue de la Paix, 75000 Paris',
  phone: '01 23 45 67 89',
  hours: [
    { days: 'Lundi – Vendredi', time: '8h00 – 19h00' },
    { days: 'Samedi', time: '9h00 – 17h00' },
    { days: 'Dimanche', time: 'Fermé' },
  ],
}

export default async function HomePage() {
  const supabase = await getSupabaseServerClient()
  const admin = getSupabaseAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: services }, { data: singleServices }, googleData] = await Promise.all([
    supabase
      .from('services')
      .select('*')
      .eq('is_subscription', true)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('services')
      .select('*')
      .eq('is_subscription', false)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    fetchGoogleReviews(),
  ])

  const activeServiceIds = new Set<string>()
  if (user) {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('service_id')
      .eq('client_id', user.id)
      .eq('status', 'active')
    subs?.forEach((s) => activeServiceIds.add(s.service_id))
  }

  let tiersByService: Record<string, ServiceCommitmentTier[]> = {}
  if (services && services.length > 0) {
    const { data: tiers } = await admin
      .from('service_commitment_tiers')
      .select('*')
      .in('service_id', services.map((s) => s.id))
      .order('commitment_months')
    if (tiers) {
      for (const t of tiers) {
        if (!tiersByService[t.service_id]) tiersByService[t.service_id] = []
        tiersByService[t.service_id].push(t as ServiceCommitmentTier)
      }
    }
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 text-lg">
            <Car className="h-5 w-5 text-indigo-600" />
            Mirrorbook
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#concept" className="hover:text-gray-900 transition-colors">Le concept</a>
            <a href="#formules" className="hover:text-gray-900 transition-colors">Abonnements</a>
            <a href="#prestations" className="hover:text-gray-900 transition-colors">Prestations</a>
            <a href="#comment" className="hover:text-gray-900 transition-colors">Comment ça marche</a>
            <a href="#avis" className="hover:text-gray-900 transition-colors">Avis</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button variant="outline" size="sm">Mon espace</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">Connexion</Button>
              </Link>
            )}
            <Link href="/book">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Réserver
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative bg-gray-950 text-white overflow-hidden pt-16">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 60% at 50% -10%, #6366f1, transparent)',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-32 lg:py-44 flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-6 border border-indigo-800 rounded-full px-3 py-1">
            <Sparkles className="h-3 w-3" />
            Nettoyage auto professionnel
          </span>
          <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight tracking-tight mb-6">
            Votre voiture,{' '}
            <span className="text-indigo-400">toujours impeccable.</span>
          </h1>
          <p className="text-lg lg:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
            Abonnez-vous à nos formules de lavage mensuel, réservez votre créneau en ligne
            en moins de 2 minutes et récupérez une voiture brillante — à chaque fois.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/book">
              <Button
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 text-base h-auto"
              >
                Réserver maintenant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#formules">
              <Button
                size="lg"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white font-semibold px-8 py-4 text-base h-auto"
              >
                Voir les formules
              </Button>
            </a>
          </div>
          <div className="mt-16 flex items-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Sans engagement
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Produits premium
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Réservation 24h/24
            </div>
          </div>
        </div>
      </section>

      {/* ── Concept ── */}
      <section id="concept" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Le nettoyage auto réinventé
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
              Fini les passages improvisés au karcher. Avec Mirrorbook, vous choisissez une
              formule mensuelle, et votre voiture bénéficie d&apos;un entretien régulier,
              suivi et professionnel.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: CreditCard,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
                title: 'Abonnement mensuel',
                body: 'Choisissez votre formule une fois, bénéficiez d\'un tarif préférentiel tous les mois. Pas de frais cachés, pas de mauvaise surprise.',
              },
              {
                icon: CalendarCheck,
                color: 'text-violet-600',
                bg: 'bg-violet-50',
                title: 'Créneaux flexibles',
                body: 'Vos séances restent disponibles chaque mois. Réservez quand cela vous convient, depuis votre téléphone ou ordinateur.',
              },
              {
                icon: Sparkles,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                title: 'Résultat showroom',
                body: 'Nos techniciens utilisent des produits professionnels pour un rendu irréprochable, intérieur comme extérieur.',
              },
            ].map(({ icon: Icon, color, bg, title, body }) => (
              <div key={title} className="rounded-2xl border border-gray-100 p-8 hover:shadow-md transition-shadow">
                <div className={`h-12 w-12 ${bg} rounded-xl flex items-center justify-center mb-5`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Formules ── */}
      <section id="formules" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Nos formules</h2>
            <p className="text-gray-500 max-w-lg mx-auto text-base">
              Un abonnement pour chaque usage. Changez ou annulez à tout moment.
            </p>
          </div>

          {!services?.length ? (
            <p className="text-center text-gray-400">Aucune formule disponible pour le moment.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  tiers={tiersByService[service.id] ?? []}
                  isActive={activeServiceIds.has(service.id)}
                  isAuthenticated={!!user}
                />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* ── Prestations à la séance ── */}
      {singleServices && singleServices.length > 0 && (
        <section id="prestations" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Prestations à la séance
              </h2>
              <p className="text-gray-500 max-w-lg mx-auto text-base">
                Pas envie de vous engager ? Réservez une prestation ponctuelle sans abonnement.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {singleServices.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col hover:shadow-md transition-shadow"
                >
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{s.name}</h3>
                  {s.description && (
                    <p className="text-sm text-gray-500 mb-4 flex-1 whitespace-pre-line">{s.description}</p>
                  )}
                  <div className="flex items-end justify-between mt-auto pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {(s.price_cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €
                      </p>
                      {!s.hide_duration && s.duration_minutes > 0 && (
                        <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <Timer className="h-3 w-3" />
                          {s.duration_minutes} min
                        </p>
                      )}
                    </div>
                    <Link href="/book">
                      <Button size="sm" variant="outline" className="shrink-0">
                        Réserver
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Comment ça marche ── */}
      <section id="comment" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-base">
              Trois étapes simples, une voiture impeccable.
            </p>
          </div>

          <div className="relative grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: CreditCard,
                title: "Je m'abonne",
                body: 'Choisissez la formule qui correspond à vos besoins et finalisez votre abonnement en ligne en quelques clics.',
              },
              {
                step: '02',
                icon: CalendarCheck,
                title: 'Je réserve mon créneau',
                body: 'Chaque mois, utilisez votre séance incluse en choisissant la date et l\'heure qui vous conviennent depuis votre espace client.',
              },
              {
                step: '03',
                icon: Sparkles,
                title: 'Je récupère ma voiture impeccable',
                body: 'Déposez votre véhicule et repassez le chercher propre, brillant et prêt à rouler. Aussi simple que ça.',
              },
            ].map(({ step, icon: Icon, title, body }, i) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px border-t-2 border-dashed border-gray-200" />
                )}
                <div className="relative h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-200">
                  <Icon className="h-7 w-7 text-white" />
                  <span className="absolute -top-2 -right-2 h-6 w-6 bg-gray-900 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-12">
            <Link href="/book">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8">
                Commencer maintenant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Avis Google ── */}
      <section id="avis" className="py-24 bg-gray-950 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex justify-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-6 w-6 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-3">
              {googleData
                ? `${googleData.rating.toFixed(1)} / 5 — ${googleData.user_ratings_total} avis`
                : 'Ils nous font confiance'}
            </h2>
            <p className="text-gray-400 text-base max-w-xl mx-auto">
              Avis vérifiés sur Google. Rejoignez nos clients satisfaits.
            </p>
          </div>

          {googleData?.reviews && googleData.reviews.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                {googleData.reviews.slice(0, 6).map((review, i) => (
                  <div key={i} className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      {review.profile_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={review.profile_photo_url}
                          alt={review.author_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-indigo-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {review.author_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{review.author_name}</p>
                        <p className="text-xs text-gray-500">{review.relative_time_description}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className={`h-3.5 w-3.5 ${j < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 fill-gray-600'}`}
                        />
                      ))}
                    </div>
                    {review.text && (
                      <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">{review.text}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-center">
                <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-gray-600 text-gray-200 hover:bg-gray-800 hover:text-white font-semibold px-8 h-auto py-3"
                  >
                    Voir tous les avis sur Google
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
            </>
          ) : (
            <div className="text-center">
              <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gray-600 text-gray-200 hover:bg-gray-800 hover:text-white font-semibold px-8 h-auto py-4 text-base"
                >
                  Voir nos avis Google
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-14">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
              <Car className="h-5 w-5 text-indigo-400" />
              Mirrorbook
            </div>
            <p className="text-sm leading-relaxed">
              Le nettoyage auto par abonnement. Simple, régulier, professionnel.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Navigation</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#concept" className="hover:text-white transition-colors">Le concept</a></li>
              <li><a href="#formules" className="hover:text-white transition-colors">Abonnements</a></li>
              <li><a href="#prestations" className="hover:text-white transition-colors">Prestations à la séance</a></li>
              <li><a href="#comment" className="hover:text-white transition-colors">Comment ça marche</a></li>
              <li>
                <Link href="/book" className="hover:text-white transition-colors">
                  Réserver
                </Link>
              </li>
            </ul>
          </div>

          {/* Espace client */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Compte</p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">Connexion</Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">Créer un compte</Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">Mon espace client</Link>
              </li>
              <li>
                <Link href="/formules" className="hover:text-white transition-colors">Toutes les formules</Link>
              </li>
            </ul>
          </div>

          {/* Contact + Horaires */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Contact & Horaires</p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" />
                {CONTACT.address}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-gray-500" />
                {CONTACT.phone}
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" />
                <div className="space-y-0.5">
                  {CONTACT.hours.map(({ days, time }) => (
                    <p key={days}>
                      <span className="text-gray-300">{days}</span>
                      <br />
                      <span>{time}</span>
                    </p>
                  ))}
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-600">
          <p>© {new Date().getFullYear()} Mirrorbook. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors flex items-center gap-1">
              Avis Google <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
