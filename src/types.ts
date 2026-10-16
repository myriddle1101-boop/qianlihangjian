export type SubmissionPlace = 'china' | 'uk'
export type ApplicantStatus = 'employed' | 'student' | 'self_employed' | 'unemployed'
export type Channel = 'online' | 'onsite' | 'both'
export type RequirementLevel = 'required' | 'conditional' | 'recommended'
export type ItemStatus = 'todo' | 'checked' | 'uploaded' | 'needs_fix' | 'done' | 'na'
export type Severity = 'error' | 'warning' | 'info' | 'pass'

export interface Profile {
  name: string; submissionPlace: SubmissionPlace; status: ApplicantStatus; residenceCity: string
  residencePermitType: string; residencePermitExpiry: string; applicationCountry: string
  destinationCountries: string[]; entryCountry: string; departureCity: string; returnCity: string
  startDate: string; endDate: string; companions: string; fundingSource: string
  returnReason: string; schoolOrEmployer: string
}
export interface Requirement {
  id: string; category: string; name: string; en: string; level: RequirementLevel
  channel: Channel; originals: string; applies: string; source: string; sourceUrl: string; fields: string[]
}
export interface DocumentMeta { id: string; requirementId: string; name: string; size: number; type: string; file?: File }
export interface ExtractedFields { [key: string]: string }
export interface CityStay { id: string; city: string; country: string; checkin: string; checkout: string; hotel: string }
export interface ItineraryDay { date: string; city: string; transport: string; hotel: string; activityZh: string; activityEn: string; bookingNote?: string }
export interface Itinerary { cities: CityStay[]; notes: string; selectedPosts: string[]; days: ItineraryDay[]; generated: boolean }
export interface CoverLetter { style: 'formal' | 'concise' | 'explanatory'; emphasis: string[]; special: string; en: string; zh: string; generated: boolean }
export interface Issue { id: string; severity: Severity; title: string; materials: string[]; found: string; reason: string; action: string; source: string; target: string }
export interface Report { createdAt: string; coverage: number; issues: Issue[]; passedRules: string[]; uncheckedRules: string[] }
export interface InspirationPost { id: string; title: string; tags: string[]; summary: string; url?: string }
export interface AppState {
  profile: Profile | null; statuses: Record<string, ItemStatus>; documents: DocumentMeta[]
  extracted: Record<string, ExtractedFields>; itinerary: Itinerary; coverLetter: CoverLetter
  posts: InspirationPost[]; report: Report | null; stale: Record<string, boolean>
}
