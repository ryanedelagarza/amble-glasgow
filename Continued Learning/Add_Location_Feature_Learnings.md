# Add Location Feature - Implementation Learnings

**Project:** Amble (Glasgow Edition)  
**Date:** January 18, 2026  
**Feature:** User-Generated Location Discovery  
**Status:** Complete (All 5 Phases)

---

## Executive Summary

This document captures the implementation details, architectural decisions, and learnings from building the "Add Location" feature. This feature enables users to discover and add places to their Amble experience through natural language search, powered by Google Places API and Gemini AI ranking.

**Core Value Delivered:** Transform word-of-mouth recommendations into actionable travel plans in under 30 seconds.

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Architecture & Data Flow](#architecture--data-flow)
3. [Implementation Phases](#implementation-phases)
4. [Key Technical Decisions](#key-technical-decisions)
5. [New Files Created](#new-files-created)
6. [Modified Files](#modified-files)
7. [API Integrations](#api-integrations)
8. [State Management Patterns](#state-management-patterns)
9. [UI Components Added](#ui-components-added)
10. [Error Handling Strategy](#error-handling-strategy)
11. [Performance Optimizations](#performance-optimizations)
12. [Analytics Implementation](#analytics-implementation)
13. [Testing Checklist](#testing-checklist)
14. [Known Limitations](#known-limitations)
15. [Future Enhancements](#future-enhancements)

---

## Feature Overview

### User Journey

```
1. User taps [+] button in bottom navigation
2. Search interface appears with text input
3. User types query (e.g., "Scottish Design Exchange")
4. After 300ms pause, search triggers automatically
5. Google Places returns results
6. Gemini AI ranks results by relevance to user's bio
7. Results display as cards with photos, distance, ratings
8. User taps desired result
9. Place is added to their collection
10. Success toast appears with "Add Another" option
11. User can view, favorite, or remove the place later
```

### Key Metrics Tracked

| Event | Data Captured |
|-------|---------------|
| `add_location_button_tapped` | Timestamp |
| `search_initiated` | Query, query length |
| `search_completed` | Result count, time to results (ms) |
| `result_selected` | Position (1-5), place ID, name |
| `place_added` | Place ID, category |
| `place_removed` | Place ID, category |
| `search_error` | Error type, message |

---

## Architecture & Data Flow

### Component Hierarchy

```
App.tsx
├── Bottom Navigation
│   └── [+] Add Button → triggers ADD_LOCATION view
│
├── AddLocationView (inline in App.tsx)
│   ├── Search Header (back button, title)
│   ├── Search Input (debounced, 300ms)
│   ├── Loading State (skeleton cards)
│   ├── Error State (offline, quota, generic)
│   ├── Empty State (no results)
│   ├── Results List
│   │   └── Result Cards (photo, name, address, distance, rating)
│   └── Initial State (prompt to search)
│
├── Detail View
│   └── Delete Button (user-added places only)
│
├── Toast Notification
│   └── Success message with "Add Another" action
│
└── Delete Confirmation Modal
    └── Cancel / Remove buttons
```

### Data Flow

```
User Input
    ↓
handleSearchInputChange() ─→ Debounce (300ms)
    ↓
handleSearch()
    ↓
┌─────────────────────────────────────────┐
│ Check Cache (5-min TTL)                 │
│   ├── Cache Hit → Return cached results │
│   └── Cache Miss → Continue             │
└─────────────────────────────────────────┘
    ↓
searchPlaces() ─→ Google Places API
    ↓
rankSearchResults() ─→ Gemini AI
    ↓
Display Ranked Results
    ↓
User Selection
    ↓
handleSelectResult()
    ↓
Transform GooglePlaceResult → Place
    ↓
Save to userPlaces state + localStorage
    ↓
Navigate to Detail View + Show Toast
```

---

## Implementation Phases

### Phase 1: Core Search Flow (MVP)

**Deliverables:**
- [+] button in bottom navigation
- ADD_LOCATION view with search input
- Google Places Text Search API integration
- Basic result display as cards
- Place transformation and storage
- Basic error handling

**Key Code:**
```typescript
// New view type
type View = '...' | 'ADD_LOCATION';

// User places state with persistence
const [userPlaces, setUserPlaces] = useState<Place[]>([]);

// Combine curated and user places
const allPlaces = useMemo(() => [...PLACES, ...userPlaces], [userPlaces]);
```

### Phase 2: AI Ranking & Rich UI

**Deliverables:**
- Gemini-powered result ranking
- Photos in result cards
- Distance calculation and display
- "Best Match" badge on top result
- Skeleton loading states

**Key Code:**
```typescript
// Gemini ranking with fallback
const rankedIds = await rankSearchResults(query, userBio, location, results);

// Fallback to distance-based sorting if Gemini fails
function fallbackRankByDistance(results, userLocation) {
  return results
    .sort((a, b) => calculateDistance(userLocation, a) - calculateDistance(userLocation, b))
    .map(r => r.place_id);
}
```

### Phase 3: UX Polish & Edge Cases

**Deliverables:**
- Search debouncing (300ms)
- Success confirmation toast
- Enhanced error handling (offline, quota, specific messages)
- Retry mechanism with exponential backoff

**Key Code:**
```typescript
// Debounced search
const handleSearchInputChange = (value: string) => {
  setSearchQuery(value);
  if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  if (value.trim().length >= 2) {
    searchDebounceRef.current = setTimeout(handleSearch, 300);
  }
};

// Custom error types
export class PlacesApiError extends Error {
  constructor(public code: string, message: string) { ... }
}
export class OfflineError extends Error { ... }
```

### Phase 4: Persistence & Management

**Deliverables:**
- Delete functionality for user-added places
- Modal confirmation dialog
- Remove from favorites on delete
- Visual distinction in lists (blue border + "Added" badge)

**Key Code:**
```typescript
// Delete handler
const handleDeletePlace = () => {
  const updatedPlaces = userPlaces.filter(p => p.id !== selectedPlace.id);
  setUserPlaces(updatedPlaces);
  localStorage.setItem('amble_user_places', JSON.stringify(updatedPlaces));
};
```

### Phase 5: Analytics & Optimization

**Deliverables:**
- Analytics service with console logging
- Event instrumentation throughout flow
- Result caching (5-minute TTL)
- Performance timing

**Key Code:**
```typescript
// Analytics abstraction
export const analytics = {
  searchInitiated: (query) => track({ name: 'search_initiated', data: { query, queryLength: query.length } }),
  searchCompleted: (count, time) => track({ name: 'search_completed', data: { resultCount: count, timeToResults: time } }),
  // ...
};

// Cache implementation
const CACHE_TTL_MS = 5 * 60 * 1000;
const searchCache = new Map<string, CacheEntry>();
```

---

## Key Technical Decisions

### 1. Inline View vs. Separate Component

**Decision:** Keep AddLocationView inline in App.tsx  
**Reasoning:** 
- Shares state with parent (userPlaces, userBio, userLocation)
- Avoids prop drilling or context complexity
- Consistent with existing view pattern (renderDashboard, renderList, etc.)

### 2. localStorage vs. IndexedDB

**Decision:** Use localStorage  
**Reasoning:**
- Simpler API
- Sufficient for expected data size (< 100 places)
- Synchronous access
- IndexedDB would be needed for: offline-first, large datasets, complex queries

### 3. In-Memory Cache vs. localStorage Cache

**Decision:** In-memory Map with TTL  
**Reasoning:**
- Fresh data on app reload (intentional)
- No stale cache issues
- Simple implementation
- 5-minute TTL balances freshness vs. API costs

### 4. Analytics Abstraction Layer

**Decision:** Create analytics.ts service that logs to console  
**Reasoning:**
- Zero external dependencies now
- Easy to connect GA4/Mixpanel later
- Type-safe event definitions
- Single place to update when adding provider

### 5. Modal vs. Inline Delete Confirmation

**Decision:** Modal confirmation  
**Reasoning:**
- More prominent for destructive action
- Consistent with mobile UX patterns
- Prevents accidental deletions
- Clear Cancel/Remove actions

---

## New Files Created

### `services/googlePlacesService.ts`

**Purpose:** Google Places API integration

**Exports:**
- `searchPlaces(params)` - Search with caching and retry
- `getPhotoUrl(reference, maxWidth)` - Generate photo URL
- `assignCategory(googleTypes)` - Map Google types to Amble categories
- `PlacesApiError` - Custom error class
- `OfflineError` - Custom error class

**Features:**
- 5-minute result caching
- Exponential backoff retry (1s, 2s)
- Offline detection
- Specific error types for different API responses

### `services/analytics.ts`

**Purpose:** Analytics event tracking abstraction

**Exports:**
- `analytics` object with convenience methods
- `track(event)` - Generic tracking function

**Events Supported:**
- `add_location_button_tapped`
- `search_initiated`
- `search_completed`
- `result_selected`
- `place_added`
- `place_removed`
- `search_error`

---

## Modified Files

### `types.ts`

**Additions:**
```typescript
// Extended Place interface
interface Place {
  // ... existing fields
  source?: 'curated' | 'user';
  googlePlaceId?: string;
  addedAt?: string;
}

// New interface
interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number; } };
  photos?: Array<{ photo_reference: string; height: number; width: number; }>;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { open_now?: boolean; };
}
```

### `services/geminiService.ts`

**Additions:**
```typescript
// New function
export const rankSearchResults = async (
  query: string,
  userBio: string,
  userLocation: Coordinates,
  results: GooglePlaceResult[]
): Promise<string[]>

// Helper function
function fallbackRankByDistance(results, userLocation): string[]
```

### `App.tsx`

**New Imports:**
- `Plus`, `Search`, `Loader`, `AlertCircle`, `WifiOff`, `Trash2` from lucide-react
- `GooglePlaceResult` from types
- `searchPlaces`, `getPhotoUrl`, `assignCategory`, `PlacesApiError`, `OfflineError` from googlePlacesService
- `rankSearchResults` from geminiService
- `analytics` from analytics

**New State:**
- `userPlaces` - Array of user-added places
- `searchQuery` - Current search input
- `searchResults` - Google Places results
- `isSearching` - Loading state
- `searchError` - Error message
- `toast` - Toast notification state
- `showDeleteModal` - Delete confirmation modal state
- `searchDebounceRef` - Debounce timer ref

**New Components (inline):**
- `Toast` - Success notification with action
- `DeleteConfirmModal` - Confirmation dialog
- `renderAddLocation()` - Add location view

**New Handlers:**
- `handleSearch()` - Execute search with ranking
- `handleSearchInputChange()` - Debounced input handler
- `handleSelectResult()` - Add place to collection
- `handleDeletePlace()` - Remove user-added place
- `resetAddLocationView()` - Clear search state

---

## API Integrations

### Google Places API

**Endpoint:** Text Search  
**URL:** `https://maps.googleapis.com/maps/api/place/textsearch/json`

**Parameters:**
| Param | Value |
|-------|-------|
| `query` | User's search text |
| `location` | `{lat},{lng}` (user or hotel) |
| `radius` | 5000 (meters) |
| `region` | `uk` (bias to UK results) |
| `key` | `VITE_GOOGLE_PLACES_API_KEY` |

**Response Handling:**
| Status | Action |
|--------|--------|
| `OK` | Return top 5 results |
| `ZERO_RESULTS` | Return empty array |
| `OVER_QUERY_LIMIT` | Throw PlacesApiError |
| `REQUEST_DENIED` | Throw PlacesApiError |
| `INVALID_REQUEST` | Throw PlacesApiError |

**Photo URL:**
```
https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={ref}&key={key}
```

### Gemini AI (Ranking)

**Model:** `gemini-3-flash-preview`  
**Temperature:** 0.2 (for consistent ranking)

**Prompt Structure:**
```
User's search query: "{query}"
User's travel preferences: "{userBio}"

[List of places with name, address, types, rating, distance]

Respond with ONLY a JSON array of place_ids in ranked order.
```

**Fallback:** Distance-based sorting if Gemini fails

---

## State Management Patterns

### Persistence Pattern

```typescript
// Load on init
useEffect(() => {
  const saved = localStorage.getItem('amble_user_places');
  if (saved) setUserPlaces(JSON.parse(saved));
}, []);

// Save on change
const addPlace = (place) => {
  const updated = [...userPlaces, place];
  setUserPlaces(updated);
  localStorage.setItem('amble_user_places', JSON.stringify(updated));
};
```

### Debounce Pattern

```typescript
const debounceRef = useRef<NodeJS.Timeout | null>(null);

const handleInputChange = (value: string) => {
  setValue(value);
  if (debounceRef.current) clearTimeout(debounceRef.current);
  if (value.length >= 2) {
    debounceRef.current = setTimeout(doSearch, 300);
  }
};

// Cleanup
useEffect(() => {
  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };
}, []);
```

### Toast Pattern

```typescript
// State
const [toast, setToast] = useState<{ message: string; action?: () => void; actionLabel?: string } | null>(null);

// Auto-dismiss
useEffect(() => {
  if (toast) {
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }
}, [toast]);

// Trigger
setToast({
  message: 'Added to Food!',
  action: () => setView('ADD_LOCATION'),
  actionLabel: 'Add Another'
});
```

---

## UI Components Added

### Toast Component

**Features:**
- Slide-in animation from bottom
- Green checkmark icon
- Action button (optional)
- Close button
- Auto-dismiss after 4 seconds

**Styling:**
- Dark background (`bg-slate-900`)
- Positioned above bottom nav (`bottom-32`)
- Full width with padding

### DeleteConfirmModal Component

**Features:**
- Backdrop blur overlay
- Zoom-in animation
- Red trash icon
- Place name in message
- Cancel (slate) and Remove (red) buttons

**Styling:**
- Centered modal
- Max width 384px (`max-w-sm`)
- White background with shadow

### Result Card (in renderAddLocation)

**Features:**
- Photo thumbnail (100x100)
- Place name with "Best Match" badge for #1
- Address (truncated to 1 line)
- Walking time and distance
- Rating with star icon
- Amber left border for top result
- Hover effect with shadow

---

## Error Handling Strategy

### Error Types

| Type | Cause | User Message |
|------|-------|--------------|
| `OfflineError` | No internet | "No internet connection. Check your network and try again." |
| `OVER_QUERY_LIMIT` | API quota | "Too many searches. Please try again in a few minutes." |
| `REQUEST_DENIED` | API key issue | "Search service unavailable. Please try again later." |
| `INVALID_REQUEST` | Bad query | "Invalid search. Please try a different query." |
| `UNKNOWN` | Other errors | "Something went wrong. Please try again." |

### Error UI

- WifiOff icon for offline errors
- Amber AlertCircle for quota errors
- Red AlertCircle for other errors
- Context-aware titles ("No Connection", "Slow Down", "Something went wrong")
- Retry button for all error states

### Retry Mechanism

```typescript
const maxRetries = 2;
const baseDelay = 1000;

for (let attempt = 0; attempt <= maxRetries; attempt++) {
  try {
    return await fetchPlaces(url);
  } catch (error) {
    // Don't retry for non-recoverable errors
    if (error.code in ['OVER_QUERY_LIMIT', 'INVALID_REQUEST', 'REQUEST_DENIED']) {
      throw error;
    }
    // Exponential backoff
    const delay = baseDelay * Math.pow(2, attempt);
    await sleep(delay);
  }
}
```

---

## Performance Optimizations

### 1. Search Debouncing

- **Delay:** 300ms after last keystroke
- **Benefit:** Prevents API calls while user is typing
- **Implementation:** useRef with setTimeout

### 2. Result Caching

- **TTL:** 5 minutes
- **Key:** `{query}|{lat},{lng}|{radius}`
- **Benefit:** Instant results for repeated searches
- **Scope:** In-memory (clears on reload)

### 3. Lazy Photo Loading

- **onError handler:** Falls back to placeholder if photo fails
- **Placeholder:** Generic building image from Unsplash

### 4. Minimal Re-renders

- **useMemo:** allPlaces computed only when PLACES or userPlaces change
- **useMemo:** sortedPlaces computed only when dependencies change

---

## Analytics Implementation

### Console Output Format

```
[Analytics] search_initiated {query: "coffee", queryLength: 6} @ 2026-01-18T14:30:00.000Z
```

- Purple color for visibility
- Event name in bold
- Data object
- ISO timestamp

### Connecting to Real Provider

To connect to GA4:

```typescript
// In analytics.ts sendEvent function
function sendEvent(eventName: string, eventData?: Record<string, unknown>) {
  // Console logging (keep for development)
  if (LOG_TO_CONSOLE) { ... }

  // Add GA4
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, eventData);
  }
}
```

Required setup:
1. Add GA4 script to index.html
2. Set `VITE_GA_MEASUREMENT_ID` env var
3. Update sendEvent function

---

## Testing Checklist

### Search Functionality
- [ ] Search triggers after 300ms pause
- [ ] Results appear within 2 seconds (4G)
- [ ] Top result has "Best Match" badge
- [ ] Photos load correctly
- [ ] Distance shows in minutes and km
- [ ] Rating shows when available

### Place Addition
- [ ] Tapping result adds to collection
- [ ] Toast shows with correct category
- [ ] "Add Another" returns to search
- [ ] Place appears in category list
- [ ] Place shows "Added" badge in list
- [ ] Place persists after reload

### Place Deletion
- [ ] Delete button only shows for user-added places
- [ ] Modal appears on delete tap
- [ ] Cancel returns to detail view
- [ ] Remove deletes place
- [ ] Toast confirms removal
- [ ] Place removed from localStorage

### Error Handling
- [ ] Offline shows WifiOff icon
- [ ] Quota exceeded shows amber warning
- [ ] Invalid query shows error
- [ ] Retry button works
- [ ] Empty results show helpful message

### Edge Cases
- [ ] Very long place names truncate
- [ ] Missing photos show placeholder
- [ ] Duplicate detection works
- [ ] Special characters in search work

---

## Known Limitations

1. **No Offline Support:** Search requires internet; no offline queue
2. **No Category Override:** Users can't change auto-assigned category
3. **Photo Fallback:** Uses generic building image for all fallbacks
4. **Single Image:** Only stores first photo from Google Places
5. **No Edit:** Users can't edit place details after adding
6. **Session Cache:** Cache clears on app reload
7. **No Description:** Uses address as description (no rich data)

---

## Future Enhancements

### Short-term (PRD Phase 4-5 extras)

1. **Offline Queue:** Queue additions when offline, sync when online
2. **Category Picker:** Let users override auto-assigned category
3. **Multiple Photos:** Store and display photo gallery
4. **Place Details API:** Fetch hours, phone, website from Google

### Medium-term

1. **Search History:** Show recent searches for quick access
2. **Suggested Places:** AI-powered suggestions based on bio
3. **Collections:** Group places into trips or themes
4. **Notes:** Add personal notes to places

### Long-term

1. **Backend Sync:** Persist to backend for cross-device
2. **Social Sharing:** Share places or collections
3. **Collaborative:** Multiple users edit same collection
4. **Reviews:** Add personal ratings and reviews

---

## Environment Variables Required

| Variable | Purpose | Where to Set |
|----------|---------|--------------|
| `VITE_GOOGLE_PLACES_API_KEY` | Google Places API | Vercel env vars |
| `VITE_GOOGLE_AI_API_KEY` | Gemini AI (existing) | Vercel env vars |

**Security Note:** Both keys are exposed to client. Set HTTP referrer restrictions in Google Cloud Console.

---

## Commit History

| Commit | Description |
|--------|-------------|
| `7d7bfe2` | Phase 1: Core search flow |
| `0e9c90d` | Phase 2 & 3: AI ranking, debouncing, toast, error handling |
| `ff06ce5` | Phase 4 & 5: Delete places, analytics, caching |

---

## Document Metadata

**Version:** 1.0  
**Created:** January 18, 2026  
**PRD Reference:** `PRDs/New Location PRD.md`  
**Related Docs:** `Google_AI_Integration_Learnings.md`, `iOS_Deployment_Learnings.md`

---

**End of Document**
