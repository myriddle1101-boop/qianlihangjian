import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import { demoPosts } from './data'
import type { AppState, CoverLetter, Itinerary, Profile, Report } from './types'

const blankItinerary: Itinerary = { cities: [], notes: '', selectedPosts: [], days: [], generated: false }
const blankLetter: CoverLetter = { style: 'formal', emphasis: [], special: '', en: '', zh: '', generated: false }
export const initialState: AppState = { profile: null, statuses: {}, documents: [], extracted: {}, itinerary: blankItinerary, coverLetter: blankLetter, posts: demoPosts, report: null, stale: {} }
type Action =
  | { type: 'SET_PROFILE'; profile: Profile } | { type: 'SET_STATUS'; id: string; status: AppState['statuses'][string] }
  | { type: 'ADD_DOCUMENT'; document: AppState['documents'][number] } | { type: 'REMOVE_DOCUMENT'; id: string }
  | { type: 'SET_EXTRACTED'; id: string; fields: Record<string, string> } | { type: 'SET_ITINERARY'; itinerary: Itinerary }
  | { type: 'SET_LETTER'; coverLetter: CoverLetter } | { type: 'SET_REPORT'; report: Report }
  | { type: 'TOGGLE_POST'; id: string } | { type: 'ADD_POST'; post: AppState['posts'][number] } | { type: 'RESET' }
function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PROFILE': return { ...state, profile: action.profile, stale: state.profile ? { itinerary: true, cover: true, report: true } : {} }
    case 'SET_STATUS': return { ...state, statuses: { ...state.statuses, [action.id]: action.status } }
    case 'ADD_DOCUMENT': return { ...state, documents: [...state.documents.filter((d) => d.requirementId !== action.document.requirementId), action.document], statuses: { ...state.statuses, [action.document.requirementId]: 'uploaded' } }
    case 'REMOVE_DOCUMENT': return { ...state, documents: state.documents.filter((doc) => doc.id !== action.id) }
    case 'SET_EXTRACTED': return { ...state, extracted: { ...state.extracted, [action.id]: action.fields } }
    case 'SET_ITINERARY': return { ...state, itinerary: action.itinerary, stale: { ...state.stale, itinerary: false, report: true } }
    case 'SET_LETTER': return { ...state, coverLetter: action.coverLetter, stale: { ...state.stale, cover: false, report: true } }
    case 'SET_REPORT': return { ...state, report: action.report, stale: { ...state.stale, report: false } }
    case 'TOGGLE_POST': return { ...state, itinerary: { ...state.itinerary, selectedPosts: state.itinerary.selectedPosts.includes(action.id) ? state.itinerary.selectedPosts.filter((id) => id !== action.id) : [...state.itinerary.selectedPosts, action.id] } }
    case 'ADD_POST': return { ...state, posts: [...state.posts, action.post] }
    case 'RESET': return initialState
  }
}
const Store = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null)
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, () => { try { const saved = localStorage.getItem('schengen-frontend-v1'); return saved ? { ...initialState, ...JSON.parse(saved), documents: [] } : initialState } catch { return initialState } })
  useEffect(() => { localStorage.setItem('schengen-frontend-v1', JSON.stringify({ ...state, documents: [] })) }, [state])
  return <Store.Provider value={useMemo(() => ({ state, dispatch }), [state])}>{children}</Store.Provider>
}
export function useStore() { const store = useContext(Store); if (!store) throw new Error('StoreProvider missing'); return store }
