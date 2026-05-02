// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'client' | 'admin' | 'employee'

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'

export type PaymentMethod = 'stripe_one_time' | 'subscription_token'

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'paused'
  | 'incomplete'

export type TokenStatus = 'available' | 'used' | 'expired'

export type DiscountType = 'percentage' | 'fixed_cents'

// ─── DB Row Types ─────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  role: UserRole
  stripe_customer_id: string | null
  avatar_url: string | null
  created_at: string
}

export interface Employee {
  id: string
  profile_id: string
  display_name: string
  google_calendar_id: string | null
  color: string
  is_active: boolean
  created_at: string
}

export interface Service {
  id: string
  name: string
  description: string | null
  price_cents: number
  duration_minutes: number
  category: string | null
  stripe_price_id: string | null
  is_subscription: boolean
  stripe_sub_price_id: string | null
  tokens_per_renewal: number | null
  image_url: string | null
  is_active: boolean
  sort_order: number
  tax_rate: number
  deposit_percent: number | null
  min_lead_hours: number
  max_lead_days: number | null
  hide_duration: boolean
  commitment_months: number | null
  created_at: string
}

export interface ServiceAddon {
  id: string
  name: string
  description: string | null
  price_cents: number
  duration_minutes: number
  applicable_to: string[]
  is_active: boolean
  sort_order: number
}

export interface ServiceCommitmentTier {
  id: string
  service_id: string
  commitment_months: number
  price_cents: number
  stripe_price_id: string | null
  created_at: string
}

export interface AvailabilitySchedule {
  id: string
  employee_id: string
  day_of_week: number // 0 = Sunday, 6 = Saturday
  start_time: string // 'HH:mm:ss'
  end_time: string // 'HH:mm:ss'
  slot_duration_minutes: number
  break_minutes: number
  is_active: boolean
}

export interface AvailabilityException {
  id: string
  employee_id: string
  exception_date: string // 'YYYY-MM-DD'
  is_unavailable: boolean
  custom_start: string | null // 'HH:mm:ss'
  custom_end: string | null // 'HH:mm:ss'
  reason: string | null
}

export interface PromoCode {
  id: string
  code: string
  description: string | null
  discount_type: DiscountType
  discount_value: number
  min_purchase_cents: number | null
  max_uses: number | null
  uses_count: number
  applicable_service_ids: string[] | null
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
}

export interface Booking {
  id: string
  booking_ref: string
  client_id: string
  employee_id: string
  service_id: string
  start_at: string // timestamptz
  end_at: string // timestamptz
  status: BookingStatus
  payment_method: PaymentMethod
  stripe_payment_intent_id: string | null
  token_id: string | null
  total_price_cents: number
  discount_cents: number
  promo_code_id: string | null
  notes: string | null
  internal_notes: string | null
  google_calendar_event_id: string | null
  created_at: string
  cancelled_at: string | null
  cancellation_reason: string | null
  // Joined fields (optional)
  profiles?: Profile
  services?: Service
  employees?: Employee
}

export interface BookingAddon {
  id: string
  booking_id: string
  addon_id: string
  price_cents: number
}

export interface Subscription {
  id: string
  client_id: string
  service_id: string
  stripe_subscription_id: string
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  cancelled_at: string | null
  created_at: string
  // Joined
  services?: Service
  profiles?: Profile
}

export interface SubscriptionToken {
  id: string
  subscription_id: string
  client_id: string
  service_id: string
  status: TokenStatus
  stripe_invoice_id: string | null
  issued_at: string
  expires_at: string | null
  used_at: string | null
  booking_id: string | null
}

export interface Invoice {
  id: string
  invoice_number: string
  client_id: string
  booking_id: string | null
  subscription_id: string | null
  stripe_payment_intent_id: string | null
  stripe_invoice_id: string | null
  amount_cents: number
  tax_cents: number
  pdf_storage_path: string | null
  sent_at: string | null
  created_at: string
}

export interface PromoCodeUse {
  id: string
  promo_code_id: string
  client_id: string
  booking_id: string
  discount_applied_cents: number
  used_at: string
}

// ─── Booking Wizard (Zustand) ─────────────────────────────────────────────────

export type BookingStep =
  | 'service'
  | 'slot'
  | 'auth'
  | 'payment'
  | 'confirmation'

export interface TierOption {
  id: string
  commitment_months: number
  price_cents: number
}

export interface BookingFlowState {
  step: BookingStep
  selectedService: Service | null
  selectedTier: TierOption | null
  selectedAddons: ServiceAddon[]
  selectedDate: Date | null
  selectedSlot: string | null // 'HH:mm'
  promoCode: string | null
  promoDiscount: number // cents
  totalCents: number
  createdBookingRef: string | null
  // Actions
  setStep: (step: BookingStep) => void
  setService: (service: Service) => void
  setTier: (tier: TierOption | null) => void
  toggleAddon: (addon: ServiceAddon) => void
  setDate: (date: Date | null) => void
  setSlot: (slot: string | null) => void
  setPromoCode: (code: string | null, discount: number) => void
  setCreatedBookingRef: (ref: string) => void
  reset: () => void
}
