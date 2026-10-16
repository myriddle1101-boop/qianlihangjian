import { describe, expect, it } from 'vitest'
import { generateDays, runConsistencyCheck } from './engine'
import { initialState } from './state'
import type { AppState } from './types'

const profile = {
  name: 'Lina Chen', submissionPlace: 'uk' as const, status: 'student' as const,
  residenceCity: 'London', residencePermitType: 'Student eVisa', residencePermitExpiry: '2027-09-30',
  applicationCountry: 'France', destinationCountries: ['France', 'Italy'], entryCountry: 'France',
  departureCity: 'London', returnCity: 'London', startDate: '2026-08-01', endDate: '2026-08-10',
  companions: '', fundingSource: 'Savings', returnReason: 'University term', schoolOrEmployer: 'UCL',
}

function state(overrides: Partial<AppState> = {}): AppState {
  return { ...initialState, profile, ...overrides }
}

describe('consistency engine', () => {
  it('flags insurance gaps and an incorrect longest-stay country', () => {
    const report = runConsistencyCheck(state({
      extracted: { insurance: { insuranceStart: '2026-08-01', insuranceEnd: '2026-08-08' } },
      itinerary: { ...initialState.itinerary, cities: [
        { id: 'paris', city: 'Paris', country: 'France', checkin: '2026-08-01', checkout: '2026-08-03', hotel: 'Paris Hotel' },
        { id: 'rome', city: 'Rome', country: 'Italy', checkin: '2026-08-03', checkout: '2026-08-10', hotel: 'Rome Hotel' },
      ] },
    }))
    expect(report.issues.map((item) => item.id)).toEqual(expect.arrayContaining(['INSURANCE_DATE', 'MAIN_DESTINATION']))
  })

  it('treats checked-only materials as covered but leaves document verification to the user', () => {
    const report = runConsistencyCheck(state({ statuses: { passport: 'checked', application: 'checked' } }))
    expect(report.coverage).toBeGreaterThan(0)
    expect(report.uncheckedRules).toContain('行程与机酒')
  })
})

describe('itinerary generation', () => {
  it('creates one day entry per planned night and adds return transport', () => {
    const days = generateDays(state({ itinerary: { ...initialState.itinerary, cities: [
      { id: 'paris', city: 'Paris', country: 'France', checkin: '2026-08-01', checkout: '2026-08-03', hotel: 'Paris Hotel' },
    ] } }))
    expect(days).toHaveLength(2)
    expect(days[days.length - 1]?.transport).toContain('回程航班')
  })
})
