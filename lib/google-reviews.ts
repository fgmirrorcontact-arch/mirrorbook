export interface GoogleReview {
  author_name: string
  rating: number
  text: string
  relative_time_description: string
  profile_photo_url: string
}

export interface GooglePlaceData {
  rating: number
  user_ratings_total: number
  reviews: GoogleReview[]
}

async function resolvePlaceId(apiKey: string): Promise<string | null> {
  const envId = process.env.GOOGLE_PLACE_ID
  if (envId) return envId

  const url = new URL('https://maps.googleapis.com/maps/api/findplacefromtext/json')
  url.searchParams.set('input', 'MIRROR Nettoyage intérieur véhicules Pertuis')
  url.searchParams.set('inputtype', 'textquery')
  url.searchParams.set('fields', 'place_id')
  url.searchParams.set('key', apiKey)

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } })
  if (!res.ok) return null
  const data = await res.json()
  return data.candidates?.[0]?.place_id ?? null
}

export async function fetchGoogleReviews(): Promise<GooglePlaceData | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return null

  const placeId = await resolvePlaceId(apiKey)
  if (!placeId) return null

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', 'rating,user_ratings_total,reviews')
  url.searchParams.set('language', 'fr')
  url.searchParams.set('reviews_sort', 'newest')
  url.searchParams.set('key', apiKey)

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return null
  const data = await res.json()
  return data.result ?? null
}
