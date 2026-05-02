'use client'

import { create } from 'zustand'
import type { BookingFlowState, BookingStep, Service, ServiceAddon, TierOption } from '@/types'

const initialState = {
  step: 'service' as BookingStep,
  selectedService: null,
  selectedTier: null as TierOption | null,
  selectedAddons: [] as ServiceAddon[],
  selectedDate: null,
  selectedSlot: null,
  promoCode: null,
  promoDiscount: 0,
  totalCents: 0,
  createdBookingRef: null,
}

function computeTotal(
  service: Service | null,
  tier: TierOption | null,
  addons: ServiceAddon[],
  promoDiscount: number
): number {
  const base = tier?.price_cents ?? service?.price_cents ?? 0
  const addonSum = addons.reduce((acc, a) => acc + a.price_cents, 0)
  return Math.max(0, base + addonSum - promoDiscount)
}

export const useBookingStore = create<BookingFlowState>((set, get) => ({
  ...initialState,

  setStep(step) {
    set({ step })
  },

  setService(service) {
    const { selectedAddons, promoDiscount } = get()
    const filteredAddons = selectedAddons.filter((a) =>
      a.applicable_to.includes(service.id)
    )
    set({
      selectedService: service,
      selectedTier: null,
      selectedAddons: filteredAddons,
      totalCents: computeTotal(service, null, filteredAddons, promoDiscount),
    })
  },

  setTier(tier) {
    const { selectedService, selectedAddons, promoDiscount } = get()
    set({
      selectedTier: tier,
      totalCents: computeTotal(selectedService, tier, selectedAddons, promoDiscount),
    })
  },

  toggleAddon(addon) {
    const { selectedService, selectedTier, selectedAddons, promoDiscount } = get()
    const exists = selectedAddons.some((a) => a.id === addon.id)
    const updated = exists
      ? selectedAddons.filter((a) => a.id !== addon.id)
      : [...selectedAddons, addon]
    set({
      selectedAddons: updated,
      totalCents: computeTotal(selectedService, selectedTier, updated, promoDiscount),
    })
  },

  setDate(date) {
    set({ selectedDate: date, selectedSlot: null })
  },

  setSlot(slot) {
    set({ selectedSlot: slot })
  },

  setPromoCode(code, discount) {
    const { selectedService, selectedTier, selectedAddons } = get()
    set({
      promoCode: code,
      promoDiscount: discount,
      totalCents: computeTotal(selectedService, selectedTier, selectedAddons, discount),
    })
  },

  setCreatedBookingRef(ref) {
    set({ createdBookingRef: ref })
  },

  reset() {
    set(initialState)
  },
}))
