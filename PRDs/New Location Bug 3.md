# BUG REPORT: Category Tags Non-Interactive on Curated Places

**Priority:** P2 - Medium  
**Type:** Bug / Inconsistent Behavior  
**Assigned To:** AI Copilot Engineer (Claude Opus 4.5)  
**Reported By:** Product Management  
**Date:** January 20, 2026  
**Environment:** Production (glasgow.vercel.app)

---

## Executive Summary

Category tags are working correctly on user-added places (tappable, opens modal), but the same tags on curated/pre-populated places are non-interactive. This creates an inconsistent user experience where identical-looking UI elements behave differently based on data source.

**User Confusion:**
- "Why can I tap this tag but not that one?"
- "Some tags open a menu, others do nothing"
- Identical visual design suggests identical behavior (but doesn't deliver)

**Expected:** All category tags should be tappable and open the collection management modal, regardless of place source.

---

## Issue Description

### Current (Broken) Behavior

**User-Added Places:**
```
[Photo: Scottish Design Exchange]
Scottish Design Exchange
📍 Buchanan St, Glasgow
1515 hr 11 min  [🛍️ Shopping]  ♥️ Favorite
                     ↑
                  TAPPABLE ✓
                  Opens modal
                  Can change/remove
```

**Curated Places (e.g., University of Glasgow from screenshot):**
```
[Photo: University of Glasgow]
University of Glasgow
📍 University Ave, Glasgow
1515 hr 11 min  [📸 Sites]  ♥️ Favorite
                     ↑
                  NOT TAPPABLE ✗
                  Does nothing
                  Looks the same but broken
```

### Root Cause

**In the category tag implementation (App.tsx):**

```typescript
// Current code with source check
<button
  onClick={() => {
    // ❌ PROBLEM: Only allows interaction if user-added
    if (selectedPlace.source === 'user') {
      setShowManageModal(true);
      analytics.categoryTagTapped(selectedPlace.name, selectedPlace.category);
    } else {
      // Curated places: tag is informational only
      return; // ❌ Does nothing
    }
  }}
  className={`
    inline-flex items-center gap-1 px-2.5 py-1 rounded-xl 
    text-xs font-semibold border transition-all
    ${selectedPlace.source === 'user' 
      ? 'hover:scale-105 hover:shadow-sm active:scale-98 cursor-pointer' 
      : 'cursor-default' // ❌ Different cursor, but still looks clickable
    }
    ${categoryStyles[selectedPlace.category].bg}
    ${categoryStyles[selectedPlace.category].border}
    ${categoryStyles[selectedPlace.category].text}
  `}
>
```

**Why This Was Implemented:**
Original design decision (from change order #3, Question 5) assumed curated places shouldn't be modified. However, this creates UX confusion because:

1. **Visual Inconsistency:** Tags look identical but behave differently
2. **User Expectation Violation:** If it looks tappable, users expect it to be tappable
3. **Limited Flexibility:** Users may want to recategorize curated places or remove them from view

---

## Expected Behavior

### New (Fixed) Behavior

**All Places (Curated AND User-Added):**
```
[Photo: Any Place]
Place Name
📍 Address
Distance  [Category Tag]  ♥️ Favorite
              ↑
           TAPPABLE ✓
           Opens modal for all places
```

**Modal Behavior Based on Source:**

**For User-Added Places (source: 'user'):**
```
┌────────────────────────────────┐
│  Manage Collection             │
│                                │
│  Scottish Design Exchange      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                │
│  Change category:              │
│  ○ Food                        │
│  ○ Coffee                      │
│  ● Shopping (Current)          │
│  ○ Sites                       │
│                                │
│  [🗑️  Remove from Collection] │ ← Can remove
│                                │
│  [Cancel]         [Update]     │
└────────────────────────────────┘
```

**For Curated Places (source: 'curated'):**
```
┌────────────────────────────────┐
│  Manage Collection             │
│                                │
│  University of Glasgow         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                │
│  Change category:              │
│  ○ Food                        │
│  ○ Coffee                      │
│  ○ Shopping                    │
│  ● Sites (Current)             │
│                                │
│  ℹ️  Curated places cannot be  │ ← Info message
│     removed from your          │    instead of
│     collection.                │    remove button
│                                │
│  [Cancel]         [Update]     │
└────────────────────────────────┘
```

**Key Differences:**
1. **Category change:** Allowed for BOTH (user may want to reorganize)
2. **Remove action:** Only for user-added (curated places stay in collection)
3. **Visual indicator:** Curated modal shows info message instead of remove button

---

## Why Allow Category Changes on Curated Places?

### Use Cases

**Use Case 1: Personal Organization**
```
User: "I consider University of Glasgow more of a Shopping 
      destination (because of the campus store) than a Site."

Action: Move from Sites → Shopping category
Result: Shows up in Shopping list instead
```

**Use Case 2: Decluttering**
```
User: "I'm not interested in coffee shops, so I moved all 
      Coffee places to a separate category I don't look at."

Action: Create personal organization system
Result: More relevant recommendations
```

**Use Case 3: Trip Planning**
```
User: "I'm organizing a food tour, so I moved restaurants 
      and cafes together, even though some are Sites."

Action: Reorganize by trip theme
Result: Custom grouping for specific plans
```

### Benefits

✅ **Consistency:** All tags behave the same way  
✅ **Flexibility:** Users can personalize their experience  
✅ **No Confusion:** If it looks tappable, it is tappable  
✅ **Power User Feature:** Advanced users can customize heavily  
✅ **Non-Destructive:** Curated places can't be removed (data preserved)  

---

## Implementation Fix

### Step 1: Remove Source Check from Tag Click Handler

**Current (Broken) Code:**
```typescript
<button
  onClick={() => {
    // ❌ Remove this source check
    if (selectedPlace.source === 'user') {
      setShowManageModal(true);
      analytics.categoryTagTapped(selectedPlace.name, selectedPlace.category);
    } else {
      return; // ❌ Remove this early return
    }
  }}
  className={`...`}
>
```

**Fixed Code:**
```typescript
<button
  onClick={() => {
    // ✅ Allow all places to open modal
    setShowManageModal(true);
    analytics.categoryTagTapped(
      selectedPlace.name, 
      selectedPlace.category,
      selectedPlace.source // Track source for analytics
    );
  }}
  className={`
    inline-flex items-center gap-1 px-2.5 py-1 rounded-xl 
    text-xs font-semibold border transition-all
    hover:scale-105 hover:shadow-sm active:scale-98 cursor-pointer
    ${categoryStyles[selectedPlace.category].bg}
    ${categoryStyles[selectedPlace.category].border}
    ${categoryStyles[selectedPlace.category].text}
  `}
>
```

**Changes:**
1. ✅ Removed `if (source === 'user')` check
2. ✅ All tags now have same hover/active styles
3. ✅ All tags have `cursor-pointer` (no more `cursor-default`)
4. ✅ Analytics tracks source for insight into curated vs. user changes

---

### Step 2: Update CollectionManageModal to Handle Curated Places

**Current Modal (Only Handles User-Added):**
```typescript
const CollectionManageModal: React.FC<{
  place: Place;
  currentCategory: Category;
  onChangeCategory: (newCategory: Category) => void;
  onRemove: () => void;
  onCancel: () => void;
}> = ({ place, currentCategory, onChangeCategory, onRemove, onCancel }) => {
  // ... existing code ...
  
  {/* Remove Button - Always shows */}
  <button onClick={() => setShowRemoveConfirm(true)}>
    Remove from Collection
  </button>
};
```

**Fixed Modal (Handles Both Sources):**
```typescript
const CollectionManageModal: React.FC<{
  place: Place;
  currentCategory: Category;
  onChangeCategory: (newCategory: Category) => void;
  onRemove?: () => void; // ← Made optional (not present for curated)
  onCancel: () => void;
}> = ({ place, currentCategory, onChangeCategory, onRemove, onCancel }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>(currentCategory);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  const isCurated = place.source === 'curated' || !place.source; // Backward compatibility
  
  // ... radio button selection code (same as before) ...
  
  return (
    <div className="...modal...">
      {/* Category Selection - Same for all */}
      <div className="space-y-2 mb-6">
        {categoryOptions.map((option) => (
          <button /* radio button */>{option.label}</button>
        ))}
      </div>
      
      {/* Conditional: Remove Button OR Info Message */}
      {!isCurated && onRemove ? (
        // User-added places: Show remove button
        <button
          onClick={() => setShowRemoveConfirm(true)}
          className="w-full bg-white border-2 border-red-200 text-red-600 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300 active:scale-98 transition-all mb-4"
        >
          <Trash2 className="w-4 h-4" />
          Remove from Collection
        </button>
      ) : (
        // Curated places: Show info message
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-1">
              Curated Place
            </p>
            <p className="text-xs text-blue-700">
              You can change the category to organize this place differently, but curated places cannot be removed from your collection.
            </p>
          </div>
        </div>
      )}
      
      {/* Action Buttons - Same for all */}
      <div className="flex gap-3">
        <button onClick={onCancel}>Cancel</button>
        <button onClick={handleUpdate}>Update</button>
      </div>
    </div>
  );
};
```

**Key Changes:**
1. ✅ `onRemove` prop is now optional (`onRemove?`)
2. ✅ Check if place is curated: `place.source === 'curated'`
3. ✅ Conditionally show remove button OR info message
4. ✅ Info message explains why remove isn't available
5. ✅ Category change still works for all places

---

### Step 3: Update Category Change Handler for Curated Places

**Current Handler (Only Updates User Places):**
```typescript
const handleCategoryChange = (newCategory: Category) => {
  if (!selectedPlace) return;
  
  const updatedPlace = { ...selectedPlace, category: newCategory };
  
  // ❌ Only updates userPlaces array
  const updatedPlaces = userPlaces.map(p => 
    p.id === selectedPlace.id ? updatedPlace : p
  );
  
  setUserPlaces(updatedPlaces);
  localStorage.setItem('amble_user_places', JSON.stringify(updatedPlaces));
  
  setSelectedPlace(updatedPlace);
  setShowManageModal(false);
  
  setToast({ message: `Moved to ${newCategory}!` });
  analytics.categoryChanged(selectedPlace.name, selectedPlace.category, newCategory);
};
```

**Fixed Handler (Handles Both Sources):**
```typescript
const handleCategoryChange = (newCategory: Category) => {
  if (!selectedPlace) return;
  
  const updatedPlace = { ...selectedPlace, category: newCategory };
  
  // ✅ Check if it's a user-added or curated place
  if (selectedPlace.source === 'user') {
    // User-added: Update in userPlaces
    const updatedPlaces = userPlaces.map(p => 
      p.id === selectedPlace.id ? updatedPlace : p
    );
    setUserPlaces(updatedPlaces);
    localStorage.setItem('amble_user_places', JSON.stringify(updatedPlaces));
    
  } else {
    // Curated: Store category override separately
    const categoryOverrides = JSON.parse(
      localStorage.getItem('amble_category_overrides') || '{}'
    );
    
    categoryOverrides[selectedPlace.id] = newCategory;
    localStorage.setItem('amble_category_overrides', JSON.stringify(categoryOverrides));
  }
  
  // Update selected place state (affects UI immediately)
  setSelectedPlace(updatedPlace);
  
  // Close modal
  setShowManageModal(false);
  
  // Show toast
  setToast({
    message: `Moved to ${newCategory}!`,
    action: () => navigateToView('LIST'),
    actionLabel: 'View List'
  });
  
  // Analytics
  analytics.categoryChanged(
    selectedPlace.name,
    selectedPlace.category,
    newCategory,
    selectedPlace.source // Track if curated or user
  );
};
```

**Key Changes:**
1. ✅ Check place source before updating
2. ✅ User-added: Update in `userPlaces` array (existing behavior)
3. ✅ Curated: Store override in new `amble_category_overrides` object
4. ✅ Both paths update UI immediately via `setSelectedPlace`
5. ✅ Analytics tracks source for insights

---

### Step 4: Apply Category Overrides When Loading Places

**New: Load and Apply Overrides**
```typescript
// In App.tsx, when loading/rendering places
const applyCategorizationOverrides = (places: Place[]): Place[] => {
  const overrides = JSON.parse(
    localStorage.getItem('amble_category_overrides') || '{}'
  );
  
  return places.map(place => {
    if (overrides[place.id]) {
      return { ...place, category: overrides[place.id] };
    }
    return place;
  });
};

// When computing allPlaces
const allPlaces = useMemo(() => {
  const curatedPlaces = applyCategorizationOverrides(PLACES);
  return [...curatedPlaces, ...userPlaces];
}, [userPlaces]); // Re-compute when userPlaces changes
```

**Key Changes:**
1. ✅ Load category overrides from localStorage
2. ✅ Apply overrides to curated places before rendering
3. ✅ User-added places unaffected (already have correct category)
4. ✅ Overrides persist across sessions

---

### Step 5: Update Modal Rendering Logic

**Current Modal Render:**
```typescript
{showManageModal && selectedPlace && (
  <CollectionManageModal
    place={selectedPlace}
    currentCategory={selectedPlace.category}
    onChangeCategory={handleCategoryChange}
    onRemove={handleRemoveFromModal} // ❌ Always passed
    onCancel={() => setShowManageModal(false)}
  />
)}
```

**Fixed Modal Render:**
```typescript
{showManageModal && selectedPlace && (
  <CollectionManageModal
    place={selectedPlace}
    currentCategory={selectedPlace.category}
    onChangeCategory={handleCategoryChange}
    onRemove={
      selectedPlace.source === 'user' 
        ? handleRemoveFromModal 
        : undefined // ✅ Only pass for user-added places
    }
    onCancel={() => setShowManageModal(false)}
  />
)}
```

**Key Change:**
✅ `onRemove` only passed for user-added places (modal uses this to show/hide remove button)

---

## Implementation Checklist

### Code Changes Required

**File: App.tsx**

- [ ] Remove source check from category tag onClick
- [ ] Update category tag className (remove conditional cursor)
- [ ] Make `onRemove` optional in CollectionManageModal props
- [ ] Add conditional rendering in modal (remove button vs. info message)
- [ ] Update `handleCategoryChange` to handle curated places
- [ ] Create `applyCategorizationOverrides` function
- [ ] Apply overrides when computing `allPlaces`
- [ ] Update modal render to conditionally pass `onRemove`

**File: services/analytics.ts**

- [ ] Update `categoryTagTapped` to accept source parameter
- [ ] Update `categoryChanged` to accept source parameter

**File: New localStorage Key**

- [ ] `amble_category_overrides` - stores category changes for curated places

---

## Testing Checklist

### User-Added Places (Existing Functionality)

- [ ] Tag is tappable
- [ ] Modal opens with category selection
- [ ] Can change category
- [ ] Can remove from collection
- [ ] Changes persist after reload
- [ ] Toast confirms action

### Curated Places (New Functionality)

- [ ] Tag is tappable (not grayed out)
- [ ] Modal opens with category selection
- [ ] Can change category
- [ ] Info message shows instead of remove button
- [ ] Info message explains curated places can't be removed
- [ ] Category change persists after reload
- [ ] Changed category shows in correct list
- [ ] Toast confirms category change

### Cross-Functionality

- [ ] Moving curated place to new category shows in that list
- [ ] Curated place disappears from old category list
- [ ] User-added places still work as before
- [ ] Analytics tracks source (curated vs. user)
- [ ] localStorage stores overrides correctly
- [ ] Overrides applied on app load

### Edge Cases

- [ ] Change curated place category multiple times
- [ ] Close app and reopen (overrides persist)
- [ ] Add user place with same name as curated (both editable)
- [ ] Category tag appearance consistent (curated vs. user)
- [ ] Modal appearance differs only in remove section

---

## Analytics Updates

### Updated Events

**Event: categoryTagTapped**
```typescript
// Before:
analytics.categoryTagTapped(placeName, currentCategory);

// After (include source):
analytics.categoryTagTapped(placeName, currentCategory, source);

// Data captured:
{
  name: 'category_tag_tapped',
  data: {
    placeName: 'University of Glasgow',
    currentCategory: 'Sites',
    source: 'curated' // ← NEW: Track if curated or user
  }
}
```

**Event: categoryChanged**
```typescript
// Before:
analytics.categoryChanged(placeName, fromCategory, toCategory);

// After (include source):
analytics.categoryChanged(placeName, fromCategory, toCategory, source);

// Data captured:
{
  name: 'category_changed',
  data: {
    placeName: 'University of Glasgow',
    fromCategory: 'Sites',
    toCategory: 'Shopping',
    source: 'curated' // ← NEW: Track if curated or user
  }
}
```

### New Insights to Track

**Metrics:**
1. **Curated Tag Tap Rate:** % of curated places where tag is tapped
2. **Curated Category Changes:** # of times curated places are recategorized
3. **Most Changed Categories:** Which curated categories users reorganize most
4. **User vs. Curated Edits:** Ratio of user-added edits vs. curated edits

**Why This Matters:**
- Understand if users want more customization
- Identify if default categories are wrong
- Inform future curation decisions

---

## Success Criteria

The bug will be considered **FIXED** when:

1. ✅ All category tags are tappable (curated and user-added)
2. ✅ Tags have consistent styling (no visual difference)
3. ✅ Modal opens for all places
4. ✅ Modal shows remove button for user-added places only
5. ✅ Modal shows info message for curated places
6. ✅ Category changes work for all places
7. ✅ Curated category changes persist in localStorage
8. ✅ Changed curated places appear in correct lists
9. ✅ Analytics tracks source (curated vs. user)
10. ✅ No console errors or warnings

---

## Timeline

**Target Completion:** 24 hours  
**Estimated Effort:** 2 hours

**Breakdown:**
- Remove source check from tag: 15 min
- Update modal component: 30 min
- Implement category override logic: 45 min
- Apply overrides on load: 20 min
- Testing: 30 min

---

## Data Model Changes

### New localStorage Key

**Key:** `amble_category_overrides`

**Structure:**
```json
{
  "place-123": "Shopping",
  "place-456": "Food",
  "place-789": "Coffee"
}
```

**Purpose:** Store category reassignments for curated places without modifying original data

**Why This Approach:**
- ✅ Non-destructive (original PLACES array unchanged)
- ✅ Easy to reset (delete key to restore defaults)
- ✅ Scoped per-device (if backend sync added later, can merge)
- ✅ Simple lookup (O(1) access by place ID)

---

## Rollback Plan

If issues arise:

**Rollback Steps:**
1. Revert category tag to only work for user-added places
2. Remove category override logic
3. Clear `amble_category_overrides` from localStorage
4. Deploy previous version

**Previous Working State:**
- User-added tags work
- Curated tags are informational only
- No category overrides stored

**Note:** This is a pure enhancement, not a breaking change, so rollback is safe.

---

## Related Documentation

- Previous Change Order: `category-tag-redesign-change-order.md`
- UX Improvements: `add-location-ux-improvements-change-order.md`
- Original PRD: `add-location-prd.md`

---

## Communication Plan

**Engineer should report:**

1. **After 1 hour:** Confirm tag click handler updated
   - All tags now tappable?
   - Modal opening for curated places?

2. **After completion:** Verification
   - Screenshot of curated place modal (with info message)
   - Screenshot of user-added place modal (with remove button)
   - Video of changing curated place category
   - Confirm localStorage override working

---

**End of Bug Report**

**Next Step:** Engineer to implement fix, test both curated and user-added places, verify category overrides persist.