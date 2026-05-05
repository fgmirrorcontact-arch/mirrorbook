import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { ServiceCard, SingleServiceCard } from './(client)/formules/FormulesClient'
import { fetchGoogleReviews } from '@/lib/google-reviews'
import type { ServiceCommitmentTier } from '@/types'
import {
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
} from 'lucide-react'

const GOOGLE_REVIEWS_URL = 'https://share.google/IeuPTUHBxH9qhNn6D'

const CONTACT = {
  address: '79 Rue Denis Papin, 84120 Pertuis',
  phone: '06 95 55 81 07',
  hours: [
    { days: 'Mardi – Vendredi', time: '9h00 – 18h00' },
    { days: 'Lundi & Week-end', time: 'Fermé' },
  ],
}

export const dynamic = 'force-dynamic'

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
    <div className="min-h-screen">

      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-charbon/95 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display font-bold italic text-white text-xl tracking-wide uppercase">
            <img src="/logo.svg" alt="Mirrorbook" className="h-8 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
            <a href="#concept" className="hover:text-white transition-colors duration-200">Le concept</a>
            <a href="#formules" className="hover:text-white transition-colors duration-200">Abonnements</a>
            <a href="#prestations" className="hover:text-white transition-colors duration-200">Prestations</a>
            <a href="#comment" className="hover:text-white transition-colors duration-200">Comment ça marche</a>
            <a href="#avis" className="hover:text-white transition-colors duration-200">Avis</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/10">
                  Mon espace
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/10">
                  Connexion
                </Button>
              </Link>
            )}
            <Link href="/book">
              <Button size="sm">
                Réserver
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative bg-charbon text-white overflow-hidden pt-16">
        <Image
          src="/hero.jpg"
          alt=""
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-charbon/75" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 70% 50% at 50% 0%, #203727, transparent)',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-52 flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-lime uppercase tracking-widest mb-8 border border-lime/30 rounded-full px-4 py-1.5">
            <Sparkles className="h-3 w-3" />
            Nettoyage auto professionnel
          </span>
          <h1
            className="text-4xl sm:text-6xl lg:text-8xl font-extrabold italic uppercase leading-none tracking-tight mb-8"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Votre véhicule mérite{' '}
            <span className="text-lime">le meilleur.</span>
          </h1>
          <p className="text-lg lg:text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed font-light">
            Abonnez-vous à nos formules de lavage mensuel, réservez votre créneau en ligne
            en moins de 2 minutes et récupérez une voiture brillante à chaque fois.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/book">
              <Button
                size="lg"
                className="w-full sm:w-auto font-bold uppercase tracking-wider px-10 py-4 text-base h-auto"
              >
                Réserver maintenant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#formules">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white uppercase tracking-wider px-10 py-4 text-base h-auto"
              >
                Voir les formules
              </Button>
            </a>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-lime" />
              Produits premium
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-lime" />
              Réservation 24h/24
            </div>
          </div>
        </div>
      </section>

      {/* ── Concept ── */}
      <section id="concept" className="py-24 bg-aluminium">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-vert uppercase tracking-widest">Le concept</span>
            <h2
              className="text-4xl lg:text-5xl font-extrabold italic uppercase text-charbon mt-3 mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Le nettoyage auto réinventé
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto text-base leading-relaxed font-light">
              Fini les nettoyages bâclés à la va-vite. Avec Mirrorbook, vous choisissez une
              formule mensuelle, et votre voiture bénéficie d&apos;un entretien intérieur régulier,
              suivi et professionnel.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: CreditCard,
                title: 'Abonnement mensuel',
                body: 'Choisissez votre formule une fois, bénéficiez d\'un tarif préférentiel tous les mois. Pas de frais cachés, pas de mauvaise surprise.',
              },
              {
                icon: CalendarCheck,
                title: 'Créneaux flexibles',
                body: 'Vos séances restent disponibles chaque mois. Réservez quand cela vous convient, depuis votre téléphone ou ordinateur.',
              },
              {
                icon: Sparkles,
                title: 'Résultat showroom',
                body: 'Nos techniciens utilisent des produits professionnels pour un rendu irréprochable, intérieur comme extérieur.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
                <div className="h-12 w-12 bg-vert rounded-xl flex items-center justify-center mb-5">
                  <Icon className="h-6 w-6 text-lime" />
                </div>
                <h3 className="text-lg font-bold text-charbon mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-light">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Formules ── */}
      <section id="formules" className="py-24 bg-vert">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-lime uppercase tracking-widest">Abonnements</span>
            <h2
              className="text-4xl lg:text-5xl font-extrabold italic uppercase text-white mt-3 mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Nos formules
            </h2>
            <p className="text-gray-300 max-w-lg mx-auto text-base font-light">
              Un abonnement pour chaque usage. Changez ou annulez à tout moment.
            </p>
          </div>

          {!services?.length ? (
            <p className="text-center text-gray-400">Aucune formule disponible pour le moment.</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-6">
              {services.map((service) => (
                <div key={service.id} className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] flex">
                  <ServiceCard
                    service={service}
                    tiers={tiersByService[service.id] ?? []}
                    isActive={activeServiceIds.has(service.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Prestations à la séance ── */}
      {singleServices && singleServices.length > 0 && (
        <section id="prestations" className="py-24 bg-charbon">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <span className="text-xs font-semibold text-lime uppercase tracking-widest">À la carte</span>
              <h2
                className="text-4xl lg:text-5xl font-extrabold italic uppercase text-white mt-3 mb-4"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Prestations à la séance
              </h2>
              <p className="text-gray-400 max-w-lg mx-auto text-base font-light">
                Pas envie de vous engager ? Réservez une prestation ponctuelle sans abonnement.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
              {singleServices.map((s) => (
                <SingleServiceCard key={s.id} service={s} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Comment ça marche ── */}
      <section id="comment" className="py-24 bg-aluminium">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-vert uppercase tracking-widest">Processus</span>
            <h2
              className="text-4xl lg:text-5xl font-extrabold italic uppercase text-charbon mt-3 mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Comment ça marche ?
            </h2>
            <p className="text-gray-600 max-w-lg mx-auto text-base font-light">
              Trois étapes simples, une voiture impeccable.
            </p>
          </div>

          <div className="relative grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: CreditCard,
                title: 'Je choisis ma formule',
                body: 'Sélectionnez un abonnement mensuel ou une prestation à la séance selon vos besoins, en quelques clics.',
              },
              {
                step: '02',
                icon: CalendarCheck,
                title: 'Je réserve',
                body: 'Choisissez la date et le créneau qui vous conviennent depuis votre espace client, 24h/24.',
              },
              {
                step: '03',
                icon: Sparkles,
                title: 'Je récupère mon véhicule propre',
                body: 'Déposez votre voiture et repassez la chercher propre, brillante et prête à rouler.',
              },
            ].map(({ step, icon: Icon, title, body }, i) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px border-t-2 border-dashed border-gray-300" />
                )}
                <div className="relative h-16 w-16 bg-vert rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                  <Icon className="h-7 w-7 text-lime" />
                  <span className="absolute -top-2 -right-2 h-6 w-6 bg-lime text-charbon text-xs font-bold rounded-full flex items-center justify-center">
                    {step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-charbon mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-light">{body}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-12">
            <Link href="/book">
              <Button size="lg" className="font-bold uppercase tracking-wider px-10">
                Commencer maintenant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Avis Google ── */}
      <section id="avis" className="py-24 bg-charbon text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex justify-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-6 w-6 text-lime fill-lime" />
              ))}
            </div>
            <h2
              className="text-4xl lg:text-5xl font-extrabold italic uppercase mt-2 mb-3"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {googleData
                ? `${googleData.rating.toFixed(1)} / 5 — ${googleData.user_ratings_total} avis`
                : 'Ils nous font confiance'}
            </h2>
            <p className="text-gray-400 text-base max-w-xl mx-auto font-light">
              Avis vérifiés sur Google. Rejoignez nos clients satisfaits.
            </p>
          </div>

          {googleData?.reviews && googleData.reviews.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                {googleData.reviews.slice(0, 6).map((review, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col gap-3 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 ease-out">
                    <div className="flex items-center gap-3">
                      {review.profile_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={review.profile_photo_url}
                          alt={review.author_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-vert border border-lime/30 flex items-center justify-center text-white font-bold text-sm shrink-0">
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
                          className={`h-3.5 w-3.5 ${j < review.rating ? 'text-lime fill-lime' : 'text-gray-600 fill-gray-600'}`}
                        />
                      ))}
                    </div>
                    {review.text && (
                      <p className="text-sm text-gray-300 leading-relaxed line-clamp-4 font-light">{review.text}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-center">
                <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white uppercase tracking-wider px-8 h-auto py-3"
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
                  className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white uppercase tracking-wider px-8 h-auto py-4"
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
      <footer className="bg-[#111] text-gray-400 py-14">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">

          {/* Brand */}
          <div className="md:col-span-1">
            <div
              className="flex items-center gap-2 text-white font-bold italic uppercase text-lg mb-3"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <img src="/logo.svg" alt="Mirrorbook" className="h-8 w-auto" />
            </div>
            <p className="text-sm leading-relaxed font-light">
              Le nettoyage auto par abonnement. Simple, régulier, professionnel.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Navigation</p>
            <ul className="space-y-2 text-sm font-light">
              <li><a href="#concept" className="hover:text-white transition-colors duration-200">Le concept</a></li>
              <li><a href="#formules" className="hover:text-white transition-colors duration-200">Abonnements</a></li>
              <li><a href="#prestations" className="hover:text-white transition-colors duration-200">Prestations à la séance</a></li>
              <li><a href="#comment" className="hover:text-white transition-colors duration-200">Comment ça marche</a></li>
              <li>
                <Link href="/book" className="hover:text-white transition-colors duration-200">
                  Réserver
                </Link>
              </li>
            </ul>
          </div>

          {/* Espace client */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Compte</p>
            <ul className="space-y-2 text-sm font-light">
              <li>
                <Link href="/login" className="hover:text-white transition-colors duration-200">Connexion</Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors duration-200">Créer un compte</Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors duration-200">Mon espace client</Link>
              </li>
            </ul>
          </div>

          {/* Contact + Horaires */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Contact & Horaires</p>
            <ul className="space-y-3 text-sm font-light">
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

        <div className="max-w-6xl mx-auto px-6 mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-600">
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
