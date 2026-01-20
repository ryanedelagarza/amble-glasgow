# PRD: Add New Location Feature

## Document Control
- **Feature Name:** User-Generated Location Discovery
- **Version:** 1.0
- **Date:** January 18, 2026
- **Author:** Product Management
- **Target Implementation:** Gemini Pro 3 AI Co-pilot
- **Status:** Ready for Development

---

## Executive Summary

Enable users to discover and add places to their Amble experience through natural language input. Users can quickly search for locations they've heard about, preview relevant results with photos and distance information, and seamlessly add them to their personal collection—all from a single, conversational interface.

**Core Value Proposition:** Transform word-of-mouth recommendations into actionable travel plans in under 30 seconds.

---

## Table of Contents
1. [Product Context](#product-context)
2. [User Stories](#user-stories)
3. [Feature Requirements](#feature-requirements)
4. [Technical Architecture](#technical-architecture)
5. [User Interface Specifications](#user-interface-specifications)
6. [Data Models](#data-models)
7. [API Integration Requirements](#api-integration-requirements)
8. [Success Metrics](#success-metrics)
9. [Implementation Phases](#implementation-phases)
10. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Product Context

### Current State Analysis

**Existing App Architecture:**
- React/TypeScript single-page application
- Navigation via bottom toolbar (Home, Map, Explore)
- Curated places database (PLACES constant in constants.ts)
- Location-aware features (user location tracking)
- AI-powered concierge via Gemini (explore view)
- Category-based organization (Food, Coffee, Shopping, Sites)

**User Journey Pain Point:**
Currently, users can only interact with pre-curated locations. When they hear about a new place from friends or social media, they must:
1. Leave the app
2. Search in Google Maps or browser
3. Manually remember or save the information
4. Return to Amble for other recommendations

This breaks the user's flow and reduces app stickiness.

### Strategic Goals

1. **Increase User Engagement:** Enable users to customize their travel experience
2. **Reduce App Abandonment:** Keep users in-app for discovery activities
3. **Leverage Social Discovery:** Capture word-of-mouth recommendations
4. **Demonstrate AI Value:** Use intelligent search ranking to surface best results
5. **Prepare for User-Generated Content:** Establish foundation for community features

---

## User Stories

### Primary User Story (Hannah's Journey)

**Persona:** Hannah, 28, visiting Glasgow with friends for a long weekend

**Context:** Hannah is having coffee with her travel companions when someone mentions "Scottish Design Exchange" as a must-visit design gallery. She wants to add it to her itinerary immediately while the recommendation is fresh.

**User Flow:**
```
1. Hannah opens Amble on her phone
2. She taps the [+] button on the bottom toolbar
3. App displays search interface with prompt: "What should we do next?"
4. Hannah types: "Scottish Design Exchange"
5. App shows loading state (1-2 seconds)
6. Results appear as card-style tiles showing:
   - Thumbnail photo (from Google Places)
   - Place name
   - Address
   - Walking distance from current location
   - Brief description (if available)
7. Hannah recognizes the top result from the photo and address
8. She taps the result card
9. Place is added to her personal collection
10. She sees a confirmation and can immediately view details or return to browsing
```

**Success Criteria:**
- Hannah completes the flow in < 30 seconds
- She finds the correct place on first try (top result)
- She doesn't need to leave the app
- The photo helps her confirm the right place
- Distance information helps her plan when to visit

### Supporting User Stories

**Story 2: Quick Coffee Discovery**
- **As a** tourist walking through a neighborhood
- **I want to** quickly add a coffee shop I just passed
- **So that** I can remember to visit it later when I have time

**Story 3: Multi-Result Disambiguation**
- **As a** user searching for a common place name
- **I want to** see multiple sorted results with photos
- **So that** I can select the specific location I'm looking for

**Story 4: Failed Search Recovery**
- **As a** user who types an incorrect or ambiguous name
- **I want to** see helpful suggestions or ability to refine search
- **So that** I can still find what I'm looking for without frustration

---

## Feature Requirements

### Functional Requirements

#### FR-1: Search Initiation (MUST HAVE)
- **ID:** FR-1.1
- **Description:** Display prominent "Add Location" entry point
- **Acceptance Criteria:**
  - [+] button visible on bottom navigation bar
  - Button positioned as 4th item (after Home, Map, Explore)
  - Button uses consistent design language with other nav items
  - Tapping button transitions to search view with smooth animation

#### FR-2: Search Input (MUST HAVE)
- **ID:** FR-2.1
- **Description:** Natural language search input
- **Acceptance Criteria:**
  - Search interface displays header: "What should we do next?"
  - Input field auto-focuses on view load
  - User can type free-form text (not restricted to structured input)
  - Input accepts minimum 2 characters before enabling search
  - Maximum 100 characters to prevent abuse
  - "Search" button or Enter key triggers search
  
- **ID:** FR-2.2
- **Description:** Search query optimization
- **Technical Requirement:**
  - Query includes location context (user's current coordinates OR hotel location)
  - Query scoped to Glasgow area (to avoid irrelevant results)
  - Search bias toward current location within 5km radius

#### FR-3: Google Places Integration (MUST HAVE)
- **ID:** FR-3.1
- **Description:** Execute Places API search
- **Acceptance Criteria:**
  - Use Google Places API Text Search
  - Return top 5 results maximum
  - Include place_id, name, formatted_address, photos, geometry
  - Respect API rate limits (implement request throttling if needed)

- **ID:** FR-3.2
- **Description:** Result photo handling
- **Acceptance Criteria:**
  - Fetch at least 1 photo per result
  - Use appropriate photo size (400x300 for cards)
  - Handle cases where no photo exists (show placeholder)
  - Cache photos for 24 hours to reduce API calls

#### FR-4: AI-Powered Result Ranking (MUST HAVE)
- **ID:** FR-4.1
- **Description:** Intelligent result sorting using Gemini
- **Technical Specification:**
  ```
  Input to Gemini:
  - User's search query
  - User's current location
  - User's bio/preferences (from UserPreferences)
  - Raw Google Places results (all 5)
  
  Gemini Task:
  - Analyze which result best matches user intent
  - Consider: relevance, proximity, user preferences, popularity
  - Return: Ranked array of place_ids with confidence scores
  
  Output:
  - Sorted list with most relevant result first
  - Brief explanation for top result (optional, for future "why" feature)
  ```

- **ID:** FR-4.2
- **Description:** Ranking algorithm fallback
- **Acceptance Criteria:**
  - If Gemini unavailable: sort by distance from user
  - If user location unavailable: sort by Google Places ranking
  - Maintain deterministic ranking for testing

#### FR-5: Results Display (MUST HAVE)
- **ID:** FR-5.1
- **Description:** Result cards UI
- **Acceptance Criteria:**
  - Display results as vertical scrollable list
  - Each card shows: photo, name, address, distance
  - Distance calculated from user location (or hotel if user location unavailable)
  - Distance formatted as "X min walk" or "X.X km away"
  - Top result has visual indicator (e.g., "Best Match" badge)
  - Loading state displays skeleton cards during API call
  - Maximum 5 results shown initially

- **ID:** FR-5.2
- **Description:** Result card interaction
- **Acceptance Criteria:**
  - Tapping any card selects that location
  - Selected state provides visual feedback
  - Transition to detail view or confirmation

#### FR-6: Location Addition (MUST HAVE)
- **ID:** FR-6.1
- **Description:** Add place to user's collection
- **Acceptance Criteria:**
  - Transform Google Places data into app's Place type
  - Add to local state (or persistent storage if implemented)
  - Generate unique ID for the new place
  - Assign appropriate category based on Google Places types
  - Set priority=false (not a curator's pick)
  - Mark as user-generated (new field: `source: 'user' | 'curated'`)

- **ID:** FR-6.2
- **Description:** Post-addition flow
- **Acceptance Criteria:**
  - Show success confirmation (toast or modal)
  - Option 1: Navigate to detail view of added place
  - Option 2: Return to search for more additions
  - Option 3: Return to previous view (dashboard/list)
  - New place appears in relevant category lists immediately

### Non-Functional Requirements

#### NFR-1: Performance
- Search results appear within 2 seconds on 4G connection
- UI remains responsive during API calls (no blocking)
- Photo loading doesn't block card rendering (lazy load)
- Maximum 3 concurrent API requests

#### NFR-2: Reliability
- Handle API failures gracefully (show error message)
- Retry logic for transient failures (1 retry with exponential backoff)
- Offline detection (show appropriate message if no connection)

#### NFR-3: Accessibility
- All interactive elements keyboard accessible
- Screen reader support for search and results
- Sufficient color contrast (WCAG AA minimum)
- Touch targets minimum 44x44px

#### NFR-4: Data Privacy
- Don't persist search history without user consent
- Location data used only for distance calculation
- Google Places data cached appropriately per ToS

---

## Technical Architecture

### Component Hierarchy

```
App.tsx
  └─ BottomNav
       └─ [+] AddLocationButton (NEW)
            â"" (triggers view change)

  └─ AddLocationView (NEW)
       â"œâ"€ SearchHeader (NEW)
       â"œâ"€ SearchInput (NEW)
       â"œâ"€ LoadingState (NEW)
       â"œâ"€ ResultsList (NEW)
       â"‚    â""â"€ ResultCard (NEW) [repeated]
       â""â"€ EmptyState / ErrorState (NEW)
```

### State Management

**New State Variables:**
```typescript
// Add to App.tsx state
const [searchQuery, setSearchQuery] = useState<string>('');
const [searchResults, setSearchResults] = useState<GooglePlaceResult[]>([]);
const [isSearching, setIsSearching] = useState<boolean>(false);
const [searchError, setSearchError] = useState<string | null>(null);

// Extend existing Place[] state to include user-added places
const [userPlaces, setUserPlaces] = useState<Place[]>([]);
```

**View State:**
```typescript
// Add to existing view type
type View = 'ONBOARDING' | 'DASHBOARD' | 'LIST' | 'DETAIL' | 'EXPLORE' | 'MAP' | 'ADD_LOCATION';
```

### Data Flow

```
1. User Input
   â"" setSearchQuery()

2. Search Trigger
   â"" handleSearch()
       â"œâ"€ setIsSearching(true)
       â""â"€ Call googlePlacesService.search()

3. API Response
   â"" Google Places returns results
       â""â"€ Call geminiService.rankResults()

4. AI Ranking
   â"" Gemini returns ranked place_ids
       â""â"€ setSearchResults(ranked results)
       â""â"€ setIsSearching(false)

5. User Selection
   â"" handleSelectPlace(result)
       â"œâ"€ Transform to Place object
       â"œâ"€ setUserPlaces([...userPlaces, newPlace])
       â""â"€ Navigate to detail view
```

### Service Layer Architecture

**New File: `services/googlePlacesService.ts`**
```typescript
interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number; };
  };
  photos?: Array<{ photo_reference: string; }>;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
}

interface SearchParams {
  query: string;
  location: Coordinates;
  radius: number; // meters
}

export const searchPlaces = async (params: SearchParams): Promise<GooglePlaceResult[]> => {
  // Implementation details in next section
};

export const getPhotoUrl = (photoReference: string, maxWidth: number): string => {
  // Implementation details in next section
};
```

**Extend: `services/geminiService.ts`**
```typescript
interface RankingContext {
  userQuery: string;
  userBio: string;
  userLocation: Coordinates;
  results: GooglePlaceResult[];
}

export const rankSearchResults = async (context: RankingContext): Promise<string[]> => {
  // Returns array of place_ids in ranked order
};
```

---

## User Interface Specifications

### Screen: Add Location View

**Layout Structure:**
```
┌───────────────────────────────────────────┐
│  ← What should we do next?               │ ← Header (fixed)
├───────────────────────────────────────────┤
│  [Search input field.................] 🔍│ ← Input area (fixed)
├───────────────────────────────────────────┤
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ [Photo]                             │ │
│  │ Place Name                ⭐ Best   │ │
│  │ 123 Street Name                     │ │
│  │ 📍 5 min walk                       │ │
│  └─────────────────────────────────────┘ │
│                                           │ ← Scrollable results
│  ┌─────────────────────────────────────┐ │
│  │ [Photo]                             │ │
│  │ Another Place                       │ │
│  │ 456 Avenue                          │ │
│  │ 📍 12 min walk                      │ │
│  └─────────────────────────────────────┘ │
│                                           │
└───────────────────────────────────────────┘
```

### Visual Design Specifications

#### Search Header
```css
Component: SearchHeader
Height: 60px
Background: white
Border-bottom: 1px solid #e2e8f0 (slate-200)

Contents:
  - Back button (left): ArrowLeft icon, tap to return to previous view
  - Title (center): "What should we do next?"
  - Typography: text-lg font-bold text-slate-900
```

#### Search Input
```css
Component: SearchInput
Container padding: 16px
Background: white

Input field:
  - Width: 100%
  - Height: 48px
  - Background: #f1f5f9 (slate-100)
  - Border-radius: 12px
  - Padding: 12px 16px
  - Font-size: 16px
  - Placeholder: "Try 'Scottish Design Exchange' or 'coffee near me'"
  - Focus state: ring-2 ring-amber-500

Search button:
  - Position: absolute right side of input
  - Size: 40x40px
  - Background: slate-900 when enabled, slate-400 when disabled
  - Icon: Search (from lucide-react)
  - Disabled until query.length >= 2
```

#### Result Card
```css
Component: ResultCard
Height: auto (min 120px)
Margin-bottom: 12px
Padding: 12px
Background: white
Border-radius: 16px
Box-shadow: 0 1px 3px rgba(0,0,0,0.1)
Border-left: 4px solid transparent
  - Top result: border-left-color: #fbbf24 (amber-400)

Hover state:
  - Background: #f8fafc (slate-50)
  - Scale: 1.02
  - Transition: 200ms ease

Layout:
  Grid: 100px (photo) | 1fr (content)
  Gap: 12px

Photo section:
  - Width: 100px
  - Height: 100px
  - Border-radius: 12px
  - Object-fit: cover
  - Background (loading): #cbd5e1 (slate-300)

Content section:
  - Name: text-lg font-bold text-slate-900
  - Badge (top result only): text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full "✨ Best Match"
  - Address: text-sm text-slate-500 line-clamp-1
  - Distance: text-xs text-slate-400 flex items-center gap-1
    Icon: Navigation or MapPin (w-3 h-3)
```

#### Loading State
```css
Component: LoadingState
Display: 3 skeleton cards

Skeleton structure:
  - Shimmer animation (bg-gradient animate pulse)
  - Same dimensions as ResultCard
  - Gray blocks for photo, name, address, distance
```

#### Empty State
```css
Component: EmptyState
Display: Centered content

Icon: Search icon (w-16 h-16 text-slate-300)
Title: "No results found"
Subtitle: "Try a different search term or check the spelling"
Button: "Try Again" (returns focus to search input)
```

#### Error State
```css
Component: ErrorState
Display: Centered content

Icon: AlertCircle (w-16 h-16 text-red-400)
Title: "Something went wrong"
Subtitle: [Specific error message]
Button: "Retry Search"
```

### Interaction Specifications

#### Tap Targets
- All interactive elements: minimum 44x44px
- Card tap: entire card is clickable
- Search button: 44x44px minimum
- Back button: 44x44px minimum

#### Animations
- View transition: slide-in from right, 300ms ease-out
- Result cards: fade-in stagger (each card 50ms delay)
- Loading → Results: crossfade 200ms
- Card tap: scale 0.98 for 100ms, then navigate

#### Gestures
- Pull down to refresh (if implemented later)
- Swipe right: go back to previous view
- Long press card: show quick actions (future feature)

---

## Data Models

### Type Extensions

**Extend types.ts:**
```typescript
// Add to existing Place interface
export interface Place {
  id: string;
  name: string;
  category: Category;
  description: string;
  address: string;
  coordinates: Coordinates;
  priority: boolean;
  isOpen?: boolean;
  images: string[];
  
  // NEW FIELDS for user-generated places
  source: 'curated' | 'user';        // Track origin
  googlePlaceId?: string;             // Link to Google Places
  addedAt?: string;                   // ISO timestamp
  addedBy?: string;                   // User identifier (future)
  userRating?: number;                // Personal rating (future)
  userNotes?: string;                 // Personal notes (future)
}

// New type for Google Places API results
export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  types: string[];
  rating?: number;
  price_level?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now?: boolean;
  };
}

// New type for AI ranking response
export interface RankingResult {
  place_id: string;
  confidence: number;  // 0-1 score
  reason?: string;     // Optional explanation
}
```

### Category Assignment Logic

**Map Google Places types to Amble categories:**
```typescript
const categoryMapping: Record<string, Category> = {
  // Food category
  'restaurant': 'Food',
  'meal_delivery': 'Food',
  'meal_takeaway': 'Food',
  'food': 'Food',
  'bakery': 'Food',
  'bar': 'Food',
  
  // Coffee category
  'cafe': 'Coffee',
  'coffee': 'Coffee',
  
  // Shopping category
  'store': 'Shopping',
  'shopping_mall': 'Shopping',
  'clothing_store': 'Shopping',
  'book_store': 'Shopping',
  'jewelry_store': 'Shopping',
  'shoe_store': 'Shopping',
  
  // Sites category
  'tourist_attraction': 'Sites',
  'museum': 'Sites',
  'art_gallery': 'Sites',
  'park': 'Sites',
  'church': 'Sites',
  'synagogue': 'Sites',
  'mosque': 'Sites',
  'landmark': 'Sites',
  'point_of_interest': 'Sites',
};

// Default category if no match
const DEFAULT_CATEGORY: Category = 'Sites';
```

### Data Transformation

**Google Places → App Place:**
```typescript
function transformGooglePlaceToPlace(
  googlePlace: GooglePlaceResult,
  category: Category
): Place {
  return {
    id: `user-${googlePlace.place_id}`,
    name: googlePlace.name,
    category: category,
    description: googlePlace.formatted_address, // Use address as default description
    address: googlePlace.formatted_address,
    coordinates: {
      lat: googlePlace.geometry.location.lat,
      lng: googlePlace.geometry.location.lng,
    },
    priority: false,
    isOpen: googlePlace.opening_hours?.open_now,
    images: googlePlace.photos 
      ? [getPhotoUrl(googlePlace.photos[0].photo_reference, 800)]
      : ['/placeholder-image.jpg'], // Fallback image
    source: 'user',
    googlePlaceId: googlePlace.place_id,
    addedAt: new Date().toISOString(),
  };
}
```

---

## API Integration Requirements

### Google Places API Setup

**Required API:**
- **Service:** Places API (New)
- **Endpoint:** Text Search
- **Documentation:** https://developers.google.com/maps/documentation/places/web-service/text-search

**API Key Configuration:**
```typescript
// Environment variable
VITE_GOOGLE_PLACES_API_KEY=your_api_key_here

// Key restrictions (in Google Cloud Console):
// - HTTP referrers: your-domain.com/*
// - API restrictions: Places API only
```

**Rate Limits:**
- Free tier: 0.017 requests per second
- Recommended: Implement client-side throttling
- Cache results for duplicate queries (5 minute TTL)

### Google Places API Implementation

**File: `services/googlePlacesService.ts`**

```typescript
const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

interface SearchPlacesParams {
  query: string;
  location: Coordinates;
  radius?: number; // Default 5000 meters (5km)
}

export async function searchPlaces(params: SearchPlacesParams): Promise<GooglePlaceResult[]> {
  const { query, location, radius = 5000 } = params;
  
  const url = new URL(`${PLACES_API_URL}/textsearch/json`);
  url.searchParams.append('query', query);
  url.searchParams.append('location', `${location.lat},${location.lng}`);
  url.searchParams.append('radius', radius.toString());
  url.searchParams.append('key', GOOGLE_PLACES_API_KEY);
  url.searchParams.append('region', 'uk'); // Bias to UK results
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Places API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API status: ${data.status}`);
    }
    
    // Return top 5 results only
    return data.results.slice(0, 5);
    
  } catch (error) {
    console.error('Google Places search error:', error);
    throw error;
  }
}

export function getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
  return `${PLACES_API_URL}/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
}

export function getPlaceDetails(placeId: string): Promise<any> {
  // Future enhancement: fetch full place details
  // Including reviews, hours, phone, website, etc.
  const url = new URL(`${PLACES_API_URL}/details/json`);
  url.searchParams.append('place_id', placeId);
  url.searchParams.append('key', GOOGLE_PLACES_API_KEY);
  
  return fetch(url.toString()).then(res => res.json());
}
```

### Gemini AI Integration

**Extend: `services/geminiService.ts`**

```typescript
interface RankSearchResultsParams {
  query: string;
  userBio: string;
  userLocation: Coordinates;
  results: GooglePlaceResult[];
}

export async function rankSearchResults(
  params: RankSearchResultsParams
): Promise<string[]> {
  const { query, userBio, userLocation, results } = params;
  
  // Build prompt for Gemini
  const prompt = `
You are helping a traveler find the best place that matches their search.

User's search query: "${query}"
User's travel preferences: ${userBio}
User's current location: ${userLocation.lat}, ${userLocation.lng}

Here are the search results from Google Places:
${results.map((place, i) => `
${i + 1}. ${place.name}
   Address: ${place.formatted_address}
   Types: ${place.types.join(', ')}
   Rating: ${place.rating || 'N/A'} (${place.user_ratings_total || 0} reviews)
   Distance: ${calculateDistance(userLocation, place.geometry.location).toFixed(2)} km
   Place ID: ${place.place_id}
`).join('\n')}

Analyze these results and rank them by relevance to the user's search intent.
Consider:
1. How well the name/description matches their query
2. User's stated preferences and bio
3. Proximity to user (prefer closer places for similar matches)
4. Rating and popularity (as a tiebreaker)

Respond ONLY with a JSON array of place_ids in ranked order (most relevant first):
["place_id_1", "place_id_2", "place_id_3", ...]
`;

  try {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        temperature: 0.3, // Lower temperature for more consistent ranking
      }),
    });
    
    const data = await response.json();
    const rankedIds = JSON.parse(data.text);
    
    return rankedIds;
    
  } catch (error) {
    console.error('Gemini ranking error:', error);
    // Fallback: sort by distance
    return results
      .sort((a, b) => {
        const distA = calculateDistance(userLocation, a.geometry.location);
        const distB = calculateDistance(userLocation, b.geometry.location);
        return distA - distB;
      })
      .map(r => r.place_id);
  }
}
```

**Gemini Prompt Engineering Notes:**
- Use structured output format (JSON array) for parsing reliability
- Include all context that affects relevance (user bio, location, query)
- Specify ranking criteria explicitly
- Use low temperature (0.3) for consistent results
- Provide fallback if Gemini fails

---

## Success Metrics

### Primary Metrics

**User Engagement:**
- **Metric:** Add Location Feature Adoption Rate
- **Target:** 30% of active users add at least 1 location in first week
- **Measurement:** Track button taps, searches initiated, places added

**Search Effectiveness:**
- **Metric:** Top Result Selection Rate
- **Target:** 70% of users select the #1 ranked result
- **Measurement:** Position of selected result (1st, 2nd, 3rd, etc.)

**Completion Rate:**
- **Metric:** Search-to-Addition Conversion
- **Target:** 60% of searches result in a place being added
- **Measurement:** Searches completed / Places added

### Secondary Metrics

**Search Quality:**
- Average number of results shown per search
- Percentage of searches with zero results
- Search query character length (optimize input prompts)

**Performance:**
- Time from search initiation to results display
- API error rate (Google Places + Gemini)
- Photo load time

**User Satisfaction:**
- Feature usage frequency (repeat usage)
- Time spent in Add Location view
- Retention impact (compare users who add vs. don't add locations)

### Instrumentation Requirements

```typescript
// Analytics events to track
analytics.track('add_location_button_tapped');
analytics.track('search_initiated', { query, queryLength });
analytics.track('search_completed', { 
  resultCount, 
  hasTopResult, 
  timeToResults 
});
analytics.track('result_selected', { 
  position, 
  placeId, 
  placeName 
});
analytics.track('place_added', { 
  placeId, 
  category, 
  source: 'user' 
});
analytics.track('search_error', { 
  errorType, 
  errorMessage 
});
```

---

## Implementation Phases

### Phase 1: Core Search Flow (Week 1) - MVP

**Goal:** Enable basic search and manual result selection

**Deliverables:**
1. Add [+] button to bottom navigation
2. Create AddLocationView component with search input
3. Integrate Google Places Text Search API
4. Display results as simple list (no AI ranking yet)
5. Manual selection adds place to userPlaces state
6. Basic error handling and loading states

**Acceptance Criteria:**
- User can tap [+] and see search interface
- Typing a query and hitting search returns Google Places results
- Tapping a result adds it to the app (visible in category lists)
- No crashes on API failures

**Time Estimate:** 8-12 hours

### Phase 2: AI Ranking & Rich UI (Week 1-2)

**Goal:** Implement intelligent ranking and polished UI

**Deliverables:**
1. Integrate Gemini ranking service
2. Implement ResultCard component with photos
3. Add distance calculation and display
4. Show "Best Match" badge on top result
5. Improve loading states (skeleton cards)
6. Add category auto-assignment logic

**Acceptance Criteria:**
- Results are ranked by relevance (verified through testing)
- Each result shows photo, name, address, distance
- Top result has visual distinction
- UI matches design specifications
- Photos load without blocking card rendering

**Time Estimate:** 10-14 hours

### Phase 3: UX Polish & Edge Cases (Week 2)

**Goal:** Handle edge cases and optimize user experience

**Deliverables:**
1. Empty state (no results found)
2. Error states (API failures, network issues)
3. Search input improvements (debouncing, min length)
4. Photo fallback handling (no image available)
5. Retry mechanisms for failed requests
6. Confirmation feedback after adding place

**Acceptance Criteria:**
- All error scenarios show helpful messages
- User is never left in a broken state
- Search performance is optimized (no excessive API calls)
- Accessibility requirements met

**Time Estimate:** 6-8 hours

### Phase 4: Persistence & Cross-Session (Week 3)

**Goal:** Save user-added places across app sessions

**Deliverables:**
1. LocalStorage or IndexedDB integration
2. Sync userPlaces on app load
3. Merge curated + user places in category lists
4. Visual distinction for user-added vs. curated places
5. Option to remove user-added places (future consideration)

**Acceptance Criteria:**
- User-added places persist after app reload
- Places appear correctly in all views (List, Map, Detail)
- No duplicate places in the database
- Data structure is future-proof for backend sync

**Time Estimate:** 6-8 hours

### Phase 5: Analytics & Optimization (Week 3)

**Goal:** Instrument and optimize based on data

**Deliverables:**
1. Add analytics tracking (all events from metrics section)
2. Implement result caching (5 min TTL for duplicate queries)
3. Optimize Gemini prompt based on ranking accuracy
4. Performance monitoring (API latency, render time)
5. A/B test prompt variations (if applicable)

**Acceptance Criteria:**
- All success metrics are tracked
- Dashboard shows adoption and conversion rates
- Performance is within SLA targets
- Data informs future improvements

**Time Estimate:** 4-6 hours

**Total Estimated Time:** 34-48 hours (4-6 days of focused development)

---

## Edge Cases & Error Handling

### Search Errors

**Case 1: No Internet Connection**
- **Detection:** `navigator.onLine === false` OR fetch timeout
- **Handling:** Show error state: "No internet connection. Check your network and try again."
- **Recovery:** Retry button, automatically retry when connection restored

**Case 2: Google Places API Quota Exceeded**
- **Detection:** API response status `OVER_QUERY_LIMIT`
- **Handling:** Show error: "Too many searches right now. Please try again in a few minutes."
- **Recovery:** Exponential backoff, suggest manual Google Maps search

**Case 3: Invalid API Key**
- **Detection:** API response status `REQUEST_DENIED`
- **Handling:** Log error to console, show generic error to user
- **Recovery:** Developer needs to fix configuration, not user-facing

**Case 4: Zero Results**
- **Detection:** API response status `ZERO_RESULTS`
- **Handling:** Show empty state with suggestions
- **Recovery:** Prompt user to try different keywords, check spelling

### AI Ranking Errors

**Case 5: Gemini API Failure**
- **Detection:** Gemini request throws error or times out
- **Handling:** Fallback to distance-based sorting silently
- **Recovery:** User sees results, ranking may be suboptimal but functional

**Case 6: Invalid Gemini Response**
- **Detection:** Response is not valid JSON or missing place_ids
- **Handling:** Fallback to original Google Places order
- **Recovery:** Log error for debugging, don't break user experience

### Data Integrity

**Case 7: Place Already Exists**
- **Detection:** Check if googlePlaceId already in userPlaces or PLACES
- **Handling:** Show message: "You've already added this place!"
- **Recovery:** Offer to view existing place or return to search

**Case 8: Missing Required Fields**
- **Detection:** Google Places result lacks name, address, or coordinates
- **Handling:** Skip this result, don't display in list
- **Recovery:** Show remaining valid results

**Case 9: Photo Load Failure**
- **Detection:** Image src returns 404 or times out
- **Handling:** Display placeholder image with place icon
- **Recovery:** No retry, placeholder is acceptable fallback

### User Input Validation

**Case 10: Empty Search Query**
- **Detection:** User submits empty or whitespace-only query
- **Handling:** Disable search button, show validation message
- **Recovery:** User must enter at least 2 characters

**Case 11: Query Too Long**
- **Detection:** Query exceeds 100 characters
- **Handling:** Truncate input, show character limit
- **Recovery:** User can edit to be more concise

**Case 12: Special Characters in Query**
- **Detection:** Query contains only symbols or numbers
- **Handling:** Allow submission (Google Places handles this)
- **Recovery:** If no results, show empty state

### Location Services

**Case 13: User Location Unavailable**
- **Detection:** `userLocation === null` (permission denied or unavailable)
- **Handling:** Use hotel location as fallback for distance calculations
- **Recovery:** Distance shown as "from hotel" instead of "from you"

**Case 14: User Location Out of Bounds**
- **Detection:** User location is >50km from Glasgow
- **Handling:** Still search, but bias results to Glasgow area
- **Recovery:** Show distances accurately, even if user is far away

### Category Assignment

**Case 15: Ambiguous Category**
- **Detection:** Google Place has multiple type matches (e.g., cafe + bar)
- **Handling:** Use first matched type in priority order
- **Recovery:** User can manually change category later (future feature)

**Case 16: Unknown Place Type**
- **Detection:** No matching type in categoryMapping
- **Handling:** Assign to default category ('Sites')
- **Recovery:** Log unknown type for future mapping updates

---

## Appendix A: Component Code Stubs

### AddLocationView Component

```typescript
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Loader, MapPin, Star } from 'lucide-react';
import { GooglePlaceResult } from '../types';
import { searchPlaces, getPhotoUrl } from '../services/googlePlacesService';
import { rankSearchResults } from '../services/geminiService';

interface AddLocationViewProps {
  userLocation: Coordinates | null;
  hotelLocation: Coordinates;
  userBio: string;
  onPlaceSelected: (result: GooglePlaceResult, category: Category) => void;
  onBack: () => void;
}

export const AddLocationView: React.FC<AddLocationViewProps> = ({
  userLocation,
  hotelLocation,
  userBio,
  onPlaceSelected,
  onBack,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GooglePlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (query.trim().length < 2) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      // Step 1: Search Google Places
      const searchLocation = userLocation || hotelLocation;
      const rawResults = await searchPlaces({
        query: query.trim(),
        location: searchLocation,
        radius: 5000,
      });
      
      if (rawResults.length === 0) {
        setResults([]);
        setIsSearching(false);
        return;
      }
      
      // Step 2: Rank with AI
      const rankedIds = await rankSearchResults({
        query,
        userBio,
        userLocation: searchLocation,
        results: rawResults,
      });
      
      // Step 3: Reorder results
      const rankedResults = rankedIds
        .map(id => rawResults.find(r => r.place_id === id))
        .filter(Boolean) as GooglePlaceResult[];
      
      setResults(rankedResults);
      
    } catch (err) {
      console.error('Search error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: GooglePlaceResult) => {
    const category = assignCategory(result.types);
    onPlaceSelected(result, category);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="p-4 bg-white shadow-sm flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h2 className="text-lg font-bold text-slate-900">What should we do next?</h2>
      </header>

      {/* Search Input */}
      <div className="p-4 bg-white border-b border-slate-100">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try 'Scottish Design Exchange' or 'coffee near me'"
            className="w-full bg-slate-100 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-amber-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={query.trim().length < 2 || isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-white rounded-lg disabled:opacity-50"
          >
            {isSearching ? <Loader className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && <ErrorState message={error} onRetry={handleSearch} />}
        {!error && results.length === 0 && query && !isSearching && <EmptyState />}
        {!error && isSearching && <LoadingState />}
        {!error && results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => (
              <ResultCard
                key={result.place_id}
                result={result}
                isTopResult={index === 0}
                distanceKm={calculateDistance(
                  userLocation || hotelLocation,
                  result.geometry.location
                )}
                onClick={() => handleSelectResult(result)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

### ResultCard Component

```typescript
interface ResultCardProps {
  result: GooglePlaceResult;
  isTopResult: boolean;
  distanceKm: number;
  onClick: () => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, isTopResult, distanceKm, onClick }) => {
  const photoUrl = result.photos?.[0]?.photo_reference
    ? getPhotoUrl(result.photos[0].photo_reference, 400)
    : '/placeholder-image.jpg';
  
  const walkTime = Math.round(distanceKm * 12); // Rough estimate: 12 min per km

  return (
    <button
      onClick={onClick}
      className={`w-full bg-white rounded-2xl p-3 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all border-l-4 ${
        isTopResult ? 'border-amber-400' : 'border-transparent'
      }`}
    >
      <div className="flex gap-3">
        {/* Photo */}
        <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-slate-200">
          <img src={photoUrl} alt={result.name} className="w-full h-full object-cover" />
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col items-start text-left">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 text-base">{result.name}</h3>
            {isTopResult && (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                Best Match
              </span>
            )}
          </div>
          
          <p className="text-sm text-slate-500 line-clamp-1 mb-2">
            {result.formatted_address}
          </p>
          
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="w-3 h-3" />
            <span>{walkTime} min walk • {distanceKm.toFixed(1)} km</span>
          </div>
        </div>
      </div>
    </button>
  );
};
```

---

## Appendix B: Testing Checklist

### Unit Tests

- [ ] Category assignment logic (all Google types → Amble categories)
- [ ] Distance calculation accuracy
- [ ] Data transformation (GooglePlaceResult → Place)
- [ ] Photo URL generation
- [ ] Query validation (length, special chars)

### Integration Tests

- [ ] Google Places API call and response parsing
- [ ] Gemini ranking integration
- [ ] Fallback ranking when Gemini fails
- [ ] LocalStorage persistence

### End-to-End Tests

- [ ] Happy path: Search → Select → Add → View in list
- [ ] No results scenario
- [ ] API error scenario
- [ ] Duplicate place scenario
- [ ] No internet scenario

### Manual Testing Checklist

**Search Functionality:**
- [ ] Search for exact place name (e.g., "Scottish Design Exchange")
- [ ] Search for generic query (e.g., "coffee")
- [ ] Search for ambiguous query (e.g., "the exchange")
- [ ] Search with typos (e.g., "Scotish design")
- [ ] Search with special characters (e.g., "café")

**Result Quality:**
- [ ] Verify top result is most relevant
- [ ] Check all results are in Glasgow area
- [ ] Confirm photos load correctly
- [ ] Verify distance calculations accurate
- [ ] Test with and without user location

**UI/UX:**
- [ ] Smooth animations
- [ ] Loading states appear appropriately
- [ ] Error messages are helpful
- [ ] Tap targets are adequate size
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility

**Data Integrity:**
- [ ] Added place appears in correct category
- [ ] Place persists after app reload
- [ ] No duplicate places
- [ ] User can view details of added place

**Performance:**
- [ ] Search completes in < 2 seconds
- [ ] Photos load without blocking UI
- [ ] No memory leaks with repeated searches
- [ ] API rate limits respected

---

## Appendix C: Future Enhancements

**Post-MVP Features to Consider:**

1. **Place Details View**
   - Fetch full Google Places details (hours, phone, website)
   - Show reviews and ratings
   - Display more photos in gallery

2. **Edit & Organize**
   - Edit place name, category, notes
   - Delete user-added places
   - Reorder places in lists

3. **Social Sharing**
   - Share place with friends
   - Import places from shared lists
   - Collaborative trip planning

4. **Advanced Search**
   - Filter by category during search
   - Filter by distance, rating, price
   - "Near me" vs "Near hotel" toggle

5. **Offline Support**
   - Cache recent search results
   - Queue additions for when back online
   - Offline maps integration

6. **Personalization**
   - Learn from user's selection patterns
   - Suggest places based on history
   - "More like this" recommendations

7. **Collections**
   - Group places into trips or themes
   - "Must visit", "Maybe later", "Visited"
   - Share collections with travelers

---

## Document Sign-off

**Ready for Development:** ✅

**Prerequisites:**
- [ ] Google Places API key obtained and configured
- [ ] Gemini API integration tested and working
- [ ] Design assets approved (if any custom illustrations needed)
- [ ] Analytics tracking code implemented
- [ ] Backend (if needed) API endpoints ready

**Development can begin when all prerequisites are met.**

**Questions or clarifications?** Contact Product Management or refer to existing codebase patterns in App.tsx and services/ directory.

---

**End of PRD**