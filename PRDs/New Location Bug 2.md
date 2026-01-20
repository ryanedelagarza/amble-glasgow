# BUG TICKET: Add Location Flow - UX Issues & Auto-Add Behavior

**Priority:** P1 - High  
**Status:** Open  
**Assigned To:** AI Copilot Engineer (Claude Opus 4.5)  
**Reported By:** Product Management  
**Date:** January 19, 2026  
**Environment:** Production (glasgow.vercel.app)

---

## Executive Summary

The Add Location search functionality is now working (API calls succeed, results display), but the **user flow after clicking a result is broken**. Three critical issues:

1. **Places are auto-added on click** instead of showing confirmation modal
2. **Duplicate detection shows error** instead of helpful message
3. **Back button navigation is broken** (blank screen or wrong view)

These issues break the intended user experience and create confusion.

---

## Bug #1: Places Auto-Add on Click (No Confirmation)

### Expected Behavior

**From Original PRD:**
```
User Journey:
1. User taps search result card
2. Confirmation modal appears showing:
   - Place name
   - Suggested category (Food/Coffee/Shopping/Sites)
   - "Add to [Category]" button
   - Cancel option
3. User approves by tapping "Add to [Category]"
4. Place is added to collection
5. Success toast appears: "Added to [Category]!"
6. User sees detail view of newly added place
```

### Actual Behavior

**Current (Broken) Flow:**
```
1. User taps search result card
2. ❌ Place immediately adds to collection (no confirmation)
3. ❌ User navigates directly to detail view
4. ❌ Success toast appears: "Added to Shopping!" (or wrong category)
5. ❌ No opportunity to review or cancel
```

**Evidence from Screenshots:**
- Screenshot 1: Shows detail view with "Added to Shopping!" toast
- No confirmation modal visible
- "Remove" button present (place already added)
- Vibe Check shows empty quotes (likely error from premature add)

### User Impact

- **No control:** User can't review category assignment before adding
- **Accidental additions:** Tapping to preview = immediate add
- **Wrong categories:** No chance to correct auto-assigned category
- **Confusion:** Toast appears but user didn't explicitly "add"

### Root Cause (Hypothesis)

In `App.tsx`, the `handleSelectResult` function likely:
1. Immediately transforms GooglePlaceResult → Place
2. Immediately adds to userPlaces
3. Immediately navigates to detail view
4. Immediately shows toast

**Missing:** Category confirmation modal step

**Expected Code Flow:**
```typescript
// CURRENT (WRONG):
const handleSelectResult = (result: GooglePlaceResult) => {
  const category = assignCategory(result.types);
  const newPlace = transformGooglePlaceToPlace(result, category);
  
  // ❌ Adds immediately without confirmation
  const updatedPlaces = [...userPlaces, newPlace];
  setUserPlaces(updatedPlaces);
  localStorage.setItem('amble_user_places', JSON.stringify(updatedPlaces));
  
  setSelectedPlace(newPlace);
  setView('DETAIL');
  setToast({
    message: `Added to ${category}!`,
    action: () => setView('ADD_LOCATION'),
    actionLabel: 'Add Another'
  });
};

// CORRECT (SHOULD BE):
const handleSelectResult = (result: GooglePlaceResult) => {
  const suggestedCategory = assignCategory(result.types);
  
  // Show confirmation modal with category selection
  setSelectedResult(result);
  setSuggestedCategory(suggestedCategory);
  setShowCategoryModal(true); // NEW: Show modal first
};

const handleConfirmAdd = (confirmedCategory: Category) => {
  const newPlace = transformGooglePlaceToPlace(selectedResult, confirmedCategory);
  
  // Now add after user confirms
  const updatedPlaces = [...userPlaces, newPlace];
  setUserPlaces(updatedPlaces);
  localStorage.setItem('amble_user_places', JSON.stringify(updatedPlaces));
  
  setSelectedPlace(newPlace);
  setShowCategoryModal(false);
  setView('DETAIL');
  setToast({
    message: `Added to ${confirmedCategory}!`,
    action: () => setView('ADD_LOCATION'),
    actionLabel: 'Add Another'
  });
};
```

### Fix Required

1. **Add new state:**
   ```typescript
   const [selectedResult, setSelectedResult] = useState<GooglePlaceResult | null>(null);
   const [suggestedCategory, setSuggestedCategory] = useState<Category>('Sites');
   const [showCategoryModal, setShowCategoryModal] = useState(false);
   ```

2. **Create CategoryConfirmModal component:**
   ```typescript
   const CategoryConfirmModal: React.FC<{
     placeName: string;
     suggestedCategory: Category;
     onConfirm: (category: Category) => void;
     onCancel: () => void;
   }> = ({ placeName, suggestedCategory, onConfirm, onCancel }) => {
     const [selectedCategory, setSelectedCategory] = useState<Category>(suggestedCategory);
     
     return (
       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
         {/* Backdrop */}
         <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
         
         {/* Modal */}
         <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
           <div className="flex flex-col">
             <h3 className="text-xl font-bold text-slate-900 mb-2">Add to Collection?</h3>
             <p className="text-sm text-slate-500 mb-4">
               <span className="font-semibold text-slate-700">{placeName}</span> will be added to:
             </p>
             
             {/* Category Selection */}
             <div className="grid grid-cols-2 gap-3 mb-6">
               {(['Food', 'Coffee', 'Shopping', 'Sites'] as Category[]).map(cat => (
                 <button
                   key={cat}
                   onClick={() => setSelectedCategory(cat)}
                   className={`py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                     selectedCategory === cat
                       ? 'bg-slate-900 text-white shadow-md'
                       : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                   }`}
                 >
                   {cat}
                 </button>
               ))}
             </div>
             
             <div className="flex gap-3">
               <button
                 onClick={onCancel}
                 className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
               >
                 Cancel
               </button>
               <button
                 onClick={() => onConfirm(selectedCategory)}
                 className="flex-1 py-3 px-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
               >
                 Add to {selectedCategory}
               </button>
             </div>
           </div>
         </div>
       </div>
     );
   };
   ```

3. **Update renderAddLocation to use modal:**
   - Change onClick to set selectedResult instead of immediately adding
   - Render CategoryConfirmModal when showCategoryModal is true

4. **Add modal to main render:**
   ```typescript
   {showCategoryModal && selectedResult && (
     <CategoryConfirmModal
       placeName={selectedResult.name}
       suggestedCategory={suggestedCategory}
       onConfirm={handleConfirmAdd}
       onCancel={() => {
         setShowCategoryModal(false);
         setSelectedResult(null);
       }}
     />
   )}
   ```

---

## Bug #2: Duplicate Detection Shows Generic Error

### Expected Behavior

**From Original PRD Edge Cases:**
```
Case 7: Place Already Exists
- Detection: Check if googlePlaceId already in userPlaces or PLACES
- Handling: Show message: "You've already added this place!"
- Recovery: Offer to view existing place or return to search
```

**Ideal UX:**
```
1. User searches for "Shilling Brew Company"
2. Results appear
3. User taps result (place already in collection)
4. Friendly modal appears:
   ┌─────────────────────────────────────┐
   │  Already in Your Collection         │
   │                                     │
   │  Shilling Brew Company is already   │
   │  saved in Coffee.                   │
   │                                     │
   │  [View Place]  [Search Again]       │
   └─────────────────────────────────────┘
```

### Actual Behavior

**Current (Broken):**
```
1. User searches for "Shilling Brew Company"
2. Results appear
3. User taps result (place already in collection)
4. ❌ Error state appears:
   "Something went wrong"
   "This place is already in your collection!"
   [Retry Search]
```

**Evidence from Screenshots:**
- Screenshot 3: Shows error state with red alert icon
- Message is negative ("Something went wrong")
- Only action is "Retry Search" (unhelpful)
- No option to view the existing place

### User Impact

- **Confusing:** "Something went wrong" implies a bug, not expected behavior
- **Dead end:** No path to view the place they wanted to see
- **Frustrating:** They found what they wanted but can't access it

### Root Cause (Hypothesis)

In `handleSelectResult` or `handleConfirmAdd`:
```typescript
// CURRENT (WRONG):
const handleConfirmAdd = (category: Category) => {
  const isDuplicate = userPlaces.some(p => p.googlePlaceId === selectedResult.place_id);
  
  if (isDuplicate) {
    // ❌ Throws error or sets error state
    setSearchError('generic');
    return;
  }
  
  // ... rest of add logic
};
```

### Fix Required

1. **Add duplicate detection before modal:**
   ```typescript
   const handleSelectResult = (result: GooglePlaceResult) => {
     // Check if already exists
     const existingPlace = allPlaces.find(p => p.googlePlaceId === result.place_id);
     
     if (existingPlace) {
       // Show "Already Added" modal instead of category modal
       setSelectedPlace(existingPlace);
       setShowDuplicateModal(true);
       return;
     }
     
     // Normal flow for new places
     const suggestedCategory = assignCategory(result.types);
     setSelectedResult(result);
     setSuggestedCategory(suggestedCategory);
     setShowCategoryModal(true);
   };
   ```

2. **Create DuplicateModal component:**
   ```typescript
   const DuplicateModal: React.FC<{
     place: Place;
     onViewPlace: () => void;
     onSearchAgain: () => void;
   }> = ({ place, onViewPlace, onSearchAgain }) => (
     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
       {/* Backdrop */}
       <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onSearchAgain} />
       
       {/* Modal */}
       <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
         <div className="flex flex-col items-center text-center">
           <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-4">
             <Star className="w-7 h-7 text-amber-600 fill-amber-600" />
           </div>
           
           <h3 className="text-xl font-bold text-slate-900 mb-2">Already in Your Collection</h3>
           <p className="text-sm text-slate-500 mb-6">
             <span className="font-semibold text-slate-700">{place.name}</span> is already saved in <span className="font-semibold text-slate-700">{place.category}</span>.
           </p>
           
           <div className="flex gap-3 w-full">
             <button
               onClick={onSearchAgain}
               className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
             >
               Search Again
             </button>
             <button
               onClick={onViewPlace}
               className="flex-1 py-3 px-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
             >
               View Place
             </button>
           </div>
         </div>
       </div>
     </div>
   );
   ```

3. **Add state and render:**
   ```typescript
   const [showDuplicateModal, setShowDuplicateModal] = useState(false);
   
   // In main render:
   {showDuplicateModal && selectedPlace && (
     <DuplicateModal
       place={selectedPlace}
       onViewPlace={() => {
         setShowDuplicateModal(false);
         setView('DETAIL');
       }}
       onSearchAgain={() => {
         setShowDuplicateModal(false);
         setSelectedPlace(null);
       }}
     />
   )}
   ```

---

## Bug #3: Back Button Navigation Broken from Detail View

### Expected Behavior

**When viewing a place detail from Add Location search:**
```
1. User is in ADD_LOCATION view
2. User searches and sees results
3. User taps result → confirms category → adds place
4. Detail view opens
5. User taps back arrow
6. SHOULD RETURN TO: ADD_LOCATION view with search results still visible
```

**When viewing a place detail from other sources:**
```
1. User is in LIST view
2. User taps a place
3. Detail view opens
4. User taps back arrow
5. SHOULD RETURN TO: LIST view (the previous view)
```

### Actual Behavior

**Current (Broken):**
```
1. User adds place from search
2. Detail view opens
3. User taps back arrow
4. ❌ One of these happens:
   - Blank screen appears
   - Returns to DASHBOARD instead of ADD_LOCATION
   - Returns to wrong view (MAP or LIST)
5. Search results are lost
6. User must start search over
```

**Evidence from Issue Description:**
- "I'm either seeing a blank screen or moving to the last place I was in the application"
- Navigation context is lost

### User Impact

- **Lost context:** Search results disappear
- **Inefficient:** Must re-search to add another place
- **Confusing:** Back button behavior is unpredictable
- **Frustrating:** Can't return to search results to add more places

### Root Cause (Hypothesis)

**Problem 1: No view history tracking**

Currently, back button likely uses hardcoded logic:
```typescript
// In renderDetail:
<button onClick={() => setView('DASHBOARD')}>
  <ArrowLeft />
</button>
```

This doesn't track where the user came from.

**Problem 2: Search results not preserved**

When returning to ADD_LOCATION, results are lost:
```typescript
// searchResults state is cleared somewhere
```

### Fix Required

#### Navigation Architecture (Future-Proof Quick Fix)

**Goal:** Solve the immediate problem while building foundation for full history stack later

**Implementation Strategy:**

```typescript
// STEP 1: Create navigation context type
type NavigationContext = {
  fromView?: View;           // Where did we come from?
  preserveState?: {          // What state should we preserve?
    searchResults?: GooglePlaceResult[];
    searchQuery?: string;
    scrollPosition?: number;
  };
};

// STEP 2: Add navigation context to state
const [navContext, setNavContext] = useState<NavigationContext>({});

// STEP 3: Create navigation helper (extensible for future history stack)
const navigateToView = (
  newView: View, 
  context?: NavigationContext
) => {
  // Save current view and relevant state as context
  const currentContext: NavigationContext = {
    fromView: view,
    preserveState: {}
  };
  
  // If leaving ADD_LOCATION, preserve search state
  if (view === 'ADD_LOCATION') {
    currentContext.preserveState = {
      searchResults,
      searchQuery,
    };
  }
  
  // Merge with any passed context
  setNavContext({ ...currentContext, ...context });
  setView(newView);
};

// STEP 4: Create back navigation helper
const navigateBack = () => {
  const { fromView, preserveState } = navContext;
  
  // If we have a recorded previous view, go there
  if (fromView) {
    setView(fromView);
    
    // Restore preserved state if returning to ADD_LOCATION
    if (fromView === 'ADD_LOCATION' && preserveState?.searchResults) {
      setSearchResults(preserveState.searchResults);
      setSearchQuery(preserveState.searchQuery || '');
    }
    
    // Clear context after using it
    setNavContext({});
  } else {
    // Fallback to dashboard if no context
    setView('DASHBOARD');
  }
};
```

**Usage Examples:**

```typescript
// When navigating from search results to detail:
const handleConfirmAdd = (category: Category) => {
  // ... add place logic ...
  
  // Navigate with context
  navigateToView('DETAIL', {
    fromView: 'ADD_LOCATION',
    preserveState: {
      searchResults,
      searchQuery
    }
  });
  
  // Show toast
  setToast({ ... });
};

// In detail view back button:
<button onClick={navigateBack}>
  <ArrowLeft />
</button>

// When tapping a category card from dashboard:
<CategoryCard
  onClick={() => navigateToView('LIST')}
  // fromView automatically captured as 'DASHBOARD'
/>
```

**Why This Approach:**

✅ **Solves immediate problem:** Back button works correctly  
✅ **Preserves search state:** Results don't disappear  
✅ **Single source of truth:** One function for navigation  
✅ **Easy to extend:** Can add history array later:

```typescript
// Future enhancement (Phase 4):
type NavigationState = {
  history: Array<{ view: View; context: NavigationContext }>;
  currentIndex: number;
};

// navigateBack becomes:
const navigateBack = () => {
  if (currentIndex > 0) {
    const previous = history[currentIndex - 1];
    setView(previous.view);
    restoreContext(previous.context);
    setCurrentIndex(currentIndex - 1);
  }
};
```

✅ **Minimal refactor needed:** Just change internal implementation  
✅ **Type-safe:** TypeScript ensures correct usage  
✅ **Testable:** Clear input/output for navigation

**Migration Path to Full History Stack:**

```
Phase 3.1 (Now): NavigationContext + navigateToView/Back
                 ↓
Phase 4 (Later): Add history array to NavigationContext
                 ↓
Phase 5 (Future): Add browser history integration
```

**Changes Required:**

1. **Add navigation types and state** (see above)
2. **Create `navigateToView` function** - replaces most `setView` calls
3. **Create `navigateBack` function** - replaces all back button logic
4. **Update all navigation points:**
   - Category cards → `navigateToView('LIST')`
   - Place selection → `navigateToView('DETAIL')`
   - Bottom nav buttons → `navigateToView('MAP')`, etc.
   - Back buttons → `navigateBack()`
5. **Special handling for ADD_LOCATION:**
   - Preserve `searchResults` and `searchQuery` when navigating away
   - Restore them when returning via back button

**Implementation Notes:**

- Don't clear searchResults on view change (remove any useEffect that does this)
- The context system is opt-in: views that don't need state preservation work normally
- Can add scroll position restoration later by extending preserveState
- Can add animation direction hints (slide-left vs slide-right) later

**Testing:**

```typescript
// Test 1: Basic back navigation
DASHBOARD → ADD_LOCATION → (search) → DETAIL → back
Result: Should return to ADD_LOCATION with results visible

// Test 2: State preservation
ADD_LOCATION (query: "coffee", 3 results) → DETAIL → back
Result: Should see same 3 results, "coffee" still in input

// Test 3: Multi-step navigation
DASHBOARD → LIST → DETAIL → back
Result: Should return to LIST (not ADD_LOCATION)

// Test 4: No context fallback
DETAIL (opened directly somehow) → back
Result: Should go to DASHBOARD
```

---

## Comprehensive Fix Plan

### Phase 1: Category Confirmation Modal (High Priority)

**Time Estimate:** 1 hour

1. Add state for modal (`showCategoryModal`, `selectedResult`, `suggestedCategory`)
2. Create CategoryConfirmModal component
3. Update handleSelectResult to show modal instead of immediately adding
4. Create handleConfirmAdd to execute add after confirmation
5. **Add analytics events:**
   - `category_modal_shown` when modal opens
   - `category_changed` when user changes from suggestion
6. Test flow: Search → Tap result → See modal → Confirm → Place added

**Acceptance Criteria:**
- [ ] Tapping search result shows category confirmation modal
- [ ] Modal displays place name and suggested category
- [ ] User can change category before adding
- [ ] "Add to [Category]" button adds place
- [ ] Cancel button returns to search results
- [ ] Toast shows correct category
- [ ] Analytics tracks modal shown and category changes

### Phase 2: Duplicate Detection Modal (Medium Priority)

**Time Estimate:** 45 minutes

1. Add duplicate check at start of handleSelectResult
2. Create DuplicateModal component
3. Add state for showDuplicateModal
4. Show modal when duplicate detected
5. "View Place" navigates to detail view
6. "Search Again" returns to search
7. **Add analytics event:** `duplicate_detected`

**Acceptance Criteria:**
- [ ] Tapping duplicate shows friendly "Already Added" modal
- [ ] No error state appears
- [ ] "View Place" opens detail view of existing place
- [ ] "Search Again" returns to search results
- [ ] Analytics tracks duplicate detection with place_id

### Phase 3: Navigation Architecture (Medium Priority)

**Time Estimate:** 45 minutes

**Implement Future-Proof Navigation System:**
1. Add NavigationContext type and state
2. Create navigateToView() function (replaces setView)
3. Create navigateBack() function (replaces back button logic)
4. Update all navigation points to use new functions
5. Add state preservation for ADD_LOCATION view
6. Test multi-step navigation flows

**Acceptance Criteria:**
- [ ] Back button from detail view returns to search results
- [ ] Search results and query remain visible after back
- [ ] Navigation from other views still works correctly
- [ ] Back button falls back to DASHBOARD when no context
- [ ] Code is structured to easily add history stack later
- [ ] All existing navigation still works (bottom nav, category cards, etc.)

---

## Testing Checklist

### Category Confirmation Flow
- [ ] Search for place → Tap result → Modal appears
- [ ] Modal shows correct place name
- [ ] Modal shows correct suggested category
- [ ] Can change category before adding
- [ ] "Add to [Category]" adds place to correct category
- [ ] Cancel returns to search results
- [ ] Toast shows correct category name

### Duplicate Detection Flow
- [ ] Search for existing place (e.g., "Shilling Brew Company")
- [ ] Tap result → "Already Added" modal appears
- [ ] Modal shows correct place name and category
- [ ] "View Place" opens detail view of existing place
- [ ] "Search Again" returns to search with results cleared
- [ ] No error state appears

### Back Navigation Flow
- [ ] Add place from search → Detail view opens
- [ ] Tap back → Returns to ADD_LOCATION view
- [ ] Search results still visible
- [ ] Can tap another result to add
- [ ] After adding second place, back still works
- [ ] From other views (LIST, MAP), back returns correctly

### Edge Cases
- [ ] Search for duplicate, then search for new place
- [ ] Add place, remove place, search for it again
- [ ] Change category in modal, verify correct category used
- [ ] Cancel modal, search again, add different place
- [ ] Navigate: DASHBOARD → ADD_LOCATION → DETAIL → back → back

---

## Success Criteria

The bugs will be considered **RESOLVED** when:

1. ✅ Tapping search result shows category confirmation modal (not immediate add)
2. ✅ User can review and change category before adding
3. ✅ Tapping duplicate shows friendly modal (not error state)
4. ✅ "View Place" option works for duplicates
5. ✅ Back button returns to search results (not blank screen)
6. ✅ Search results persist when navigating away and back
7. ✅ User can add multiple places in one search session
8. ✅ All toasts show correct category

---

## Visual Design Specifications

### CategoryConfirmModal

```
┌─────────────────────────────────────┐
│  Add to Collection?                 │
│                                     │
│  Scottish Design Exchange will be   │
│  added to:                          │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │  Food    │  │  Coffee  │        │
│  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐        │
│  │ Shopping │  │  Sites   │ ✓      │
│  └──────────┘  └──────────┘        │
│                                     │
│  [Cancel]  [Add to Sites]           │
└─────────────────────────────────────┘
```

**Styling:**
- Selected category: `bg-slate-900 text-white`
- Unselected: `bg-slate-100 text-slate-600`
- Grid: 2 columns, 3px gap
- Buttons: Full width, equal size

### DuplicateModal

```
┌─────────────────────────────────────┐
│         ⭐ (amber icon)             │
│                                     │
│  Already in Your Collection         │
│                                     │
│  Shilling Brew Company is already   │
│  saved in Coffee.                   │
│                                     │
│  [Search Again]  [View Place]       │
└─────────────────────────────────────┘
```

**Styling:**
- Icon: 56x56 amber circle with filled star
- Text: Centered alignment
- Buttons: 50/50 split width
- Primary action (View Place): Dark button on right

---

## Code Comments for AI Engineer

### Key Files to Modify

1. **App.tsx** (primary changes)
   - Add state: `showCategoryModal`, `selectedResult`, `suggestedCategory`, `showDuplicateModal`
   - Create components: `CategoryConfirmModal`, `DuplicateModal`
   - Modify: `handleSelectResult` (add modal logic)
   - Create: `handleConfirmAdd` (move add logic here)
   - Modify: Detail view back button

2. **services/googlePlacesService.ts** (no changes needed)

3. **services/analytics.ts** (add new events)
   - `category_modal_shown` - When modal opens, include suggestedCategory
   - `category_changed` - When user changes from suggestion, include { suggested, selected }
   - `duplicate_detected` - When user taps existing place, include place_id and category
   
   ```typescript
   // Add to analytics.ts:
   export const analytics = {
     // ... existing events ...
     
     categoryModalShown: (placeName: string, suggestedCategory: Category) => 
       track({ 
         name: 'category_modal_shown', 
         data: { placeName, suggestedCategory } 
       }),
     
     categoryChanged: (placeName: string, suggested: Category, selected: Category) =>
       track({
         name: 'category_changed',
         data: { placeName, suggested, selected }
       }),
     
     duplicateDetected: (placeId: string, placeName: string, category: Category) =>
       track({
         name: 'duplicate_detected',
         data: { placeId, placeName, category }
       }),
   };
   ```

### Testing Notes

**Local Testing:**
1. Add a place (e.g., "Shilling Brew Company")
2. Search for it again → should show duplicate modal
3. Search for new place → should show category modal
4. Add place → detail view should open
5. Back button → should return to search results

**Production Testing:**
1. Verify modals render correctly on mobile
2. Check animations work smoothly
3. Confirm toast messages are correct
4. Test rapid clicking doesn't break state

---

## Timeline

**Target Resolution:** 36 hours  
**Estimated Effort:** 3-4 hours total

**Breakdown:**
- Category Modal: 1 hour
- Duplicate Modal: 45 minutes  
- Navigation Architecture: 45 minutes ⬅️ **New: Future-proof system**
- Analytics Events: 15 minutes
- Testing: 45 minutes
- Cleanup: 15 minutes

---

## Product Manager Decisions ✅

1. **Category Modal:** ✅ **CONFIRMED** - Stick to 4 existing categories (Food, Coffee, Shopping, Sites). No custom categories for MVP.

2. **Duplicate Modal:** ✅ **CONFIRMED** - "View Place" takes user to detail view (most intuitive)

3. **Back Navigation:** ✅ **CONFIRMED** - Implement quick fix now, BUT architect it to make full history stack easy to add later. See "Navigation Architecture" section below for implementation guidance.

4. **Toast Duration:** ✅ **CONFIRMED** - Keep at 4 seconds

5. **Analytics:** ✅ **CONFIRMED** - Track category changes. Add events:
   - `category_modal_shown` - Track suggested category
   - `category_changed` - Track if user changed from suggestion
   - `duplicate_detected` - Track when user searches for existing place

---

## Related Documentation

- Original PRD: `add-location-prd.md`
- Implementation Learnings: `Add_Location_Feature_Learnings.md`
- Previous Bug Ticket: `add-location-search-bug-ticket.md`

---

**End of Ticket**

**Next Step:** Engineer to acknowledge ticket and begin Phase 1 (Category Confirmation Modal) implementation.