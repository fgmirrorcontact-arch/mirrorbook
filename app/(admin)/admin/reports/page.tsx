export const metadata = {
  title: 'Admin — Rapports',
}

const SECTIONS = [
  {
    title: 'Ventes',
    description:
      'Chiffre d\'affaires par période, par prestation, par méthode de paiement. Exportable en CSV.',
  },
  {
    title: 'Transactions',
    description:
      'Détail de chaque paiement Stripe : intention de paiement, montant, frais, date.',
  },
  {
    title: 'Réservations',
    description:
      'Volume de réservations, taux de no-show, taux d\'annulation, durée moyenne.',
  },
  {
    title: 'Clients',
    description:
      'Nouveaux clients par mois, taux de rétention, LTV (valeur vie client), segmentation.',
  },
  {
    title: 'Coupons',
    description:
      'Taux d\'utilisation des codes promo, remises accordées, impact sur le CA.',
  },
]

export default function AdminReportsPage() {
  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Rapports</h1>
      <p className="text-gray-500 text-sm mb-8">
        Analyses détaillées de l'activité de votre centre de lavage.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(({ title, description }) => (
          <div
            key={title}
            className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col"
          >
            <div className="h-10 w-10 bg-vert/10 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="h-5 w-5 text-vert"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">{title}</h2>
            <p className="text-sm text-gray-500 flex-1">{description}</p>
            <div className="mt-4 h-20 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center">
              <span className="text-xs text-gray-400">Graphique à venir</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
