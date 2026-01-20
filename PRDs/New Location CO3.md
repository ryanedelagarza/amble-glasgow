# CHANGE ORDER: Category Tag Redesign & Collection Management Modal

**Priority:** P1 - High  
**Type:** UI/UX Redesign  
**Assigned To:** AI Copilot Engineer (Claude Opus 4.5)  
**Requested By:** Product Management (UX Design Review)  
**Date:** January 19, 2026  
**Environment:** Production (glasgow.vercel.app)

---

## Executive Summary

The current "Saved in [Category]" design uses a large, full-width green button that feels like a persistent action button rather than status information. This redesign converts it to:

1. **Compact inline category tag** (colored badge next to distance/favorite)
2. **Tappable tag** that opens a management modal
3. **Unified modal** for changing category OR removing from collection
4. **All places show category** (curated and user-added) for consistency

**Benefits:**
- Reduces visual clutter (saves ~60px of vertical space)
- Improves information hierarchy (status vs. actions)
- Consolidates collection management in one place
- Makes category immediately scannable without scrolling

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Design Specifications](#design-specifications)
3. [Component Breakdown](#component-breakdown)
4. [Implementation Plan](#implementation-plan)
5. [Code Changes Required](#code-changes-required)
6. [Testing Checklist](#testing-checklist)
7. [Analytics & Tracking](#analytics--tracking)

---

## Current State Analysis

### Problem: Full-Width Green Button

**Current Design (Screenshot Evidence):**
```
┌─────────────────────────────────────┐
│  [Photo - Scottish Design Exchange] │
│  Scottish Design Exchange           │
│  Buchanan St, Glasgow G1 2FF        │
│  6 min walk away        ♥️ Favorite │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ ✓ Saved in Shopping          │  │ ← PROBLEM: 
│  └───────────────────────────────┘  │   • Takes full width
│                                     │   • Looks like a button
│  ┌───────────────────────────────┐  │   • Persistent green
│  │ 🗑️  Remove from Collection    │  │   • Separates actions
│  └───────────────────────────────┘  │   • ~80px of space
├─────────────────────────────────────┤
│  [🧭 Go Now]                        │
└─────────────────────────────────────┘
```

**Issues:**
1. **Visual Weight:** Green button draws eye away from actual actions
2. **Space Inefficient:** Takes 80px for status information
3. **Button Affordance:** Looks clickable but isn't (confusing)
4. **Separated Actions:** Remove button is disconnected from category info
5. **Scrolling Required:** Primary actions pushed down

---

## Design Specifications

### New Design: Inline Category Tag

**Target Design:**
```
┌─────────────────────────────────────────┐
│  [Photo - Scottish Design Exchange]     │
│  Scottish Design Exchange               │
│  📍 Buchanan St, Glasgow G1 2FF         │
│  6 min walk  [Shopping]  ♥️ Favorite    │ ← NEW: Inline tag
├─────────────────────────────────────────┤
│  [+ Save to Collection] (if not saved)  │
│  or                                     │
│  (Nothing here if saved)                │ ← Removed green button
├─────────────────────────────────────────┤
│  [🧭 Go Now]                            │
├─────────────────────────────────────────┤
│  VIBE CHECK                             │
│  "You will adore this curated hub..."   │
└─────────────────────────────────────────┘
```

**Space Saved:** ~80px vertical space (better above-fold experience)

---

### Category Tag Visual Specifications

**Design System:**

Each category gets a **light tinted badge** that stands out but doesn't dominate:

```css
Category: Food
  Background: #FEF3C7 (amber-100 at 60% opacity)
  Border: 1px solid #FCD34D (amber-300 at 40% opacity)
  Text: #92400E (amber-900)
  Icon: 🍽️ (optional)

Category: Coffee  
  Background: #FEF3E2 (orange-100/yellow mix at 60%)
  Border: 1px solid #FDBA74 (orange-300 at 40%)
  Text: #7C2D12 (orange-900)
  Icon: ☕ (optional)

Category: Shopping
  Background: #FCE7F3 (pink-100 at 60%)
  Border: 1px solid #F9A8D4 (pink-300 at 40%)
  Text: #831843 (pink-900)
  Icon: 🛍️ (optional)

Category: Sites
  Background: #D1FAE5 (emerald-100 at 60%)
  Border: 1px solid #6EE7B7 (emerald-300 at 40%)
  Text: #064E3B (emerald-900)
  Icon: 📸 (optional)
```

**Tag Structure:**
```html
<button className="category-tag">
  <span className="category-icon">🛍️</span>
  <span className="category-name">Shopping</span>
</button>
```

**CSS Classes:**
```css
.category-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.category-tag:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.category-tag:active {
  transform: scale(0.98);
}

.category-icon {
  font-size: 14px;
  line-height: 1;
}

.category-name {
  line-height: 1;
}
```

**Tailwind Implementation:**
```typescript
// Category color mapping
const categoryStyles = {
  Food: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    icon: '🍽️'
  },
  Coffee: {
    bg: 'bg-orange-50',
    border: 'border-orange-200', 
    text: 'text-orange-900',
    icon: '☕'
  },
  Shopping: {
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-900',
    icon: '🛍️'
  },
  Sites: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    icon: '📸'
  }
};

// Component usage
<button
  onClick={() => setShowManageModal(true)}
  className={`
    inline-flex items-center gap-1 px-2.5 py-1 rounded-xl 
    text-xs font-semibold border transition-all
    hover:scale-105 hover:shadow-sm active:scale-98
    ${categoryStyles[category].bg}
    ${categoryStyles[category].border}
    ${categoryStyles[category].text}
  `}
>
  <span className="text-sm">{categoryStyles[category].icon}</span>
  <span>{category}</span>
</button>
```

---

### Detail View Layout Changes

**Before (Current):**
```
[Photo]
[Name]
[Address]
[Distance]  [Favorite]
---
[✓ Saved in Shopping] ← 80px height
[Remove from Collection]
---
[Go Now]
[Vibe Check...]
```

**After (New):**
```
[Photo]
[Name]
[Address]
[Distance] [Shopping] [Favorite] ← Inline, compact
---
[+ Save to Collection] (if not saved)
(nothing if saved - tag above shows status)
---
[Go Now]
[Vibe Check...]
```

**New Metadata Row Structure:**
```typescript
{/* Metadata Row - Distance, Category, Favorite */}
<div className="flex items-center gap-3 text-sm text-slate-500 px-4 pb-3">
  {/* Distance */}
  <div className="flex items-center gap-1">
    <Navigation className="w-4 h-4" />
    <span>{distanceText}</span>
  </div>
  
  {/* Category Tag - ALL PLACES (curated and user-added) */}
  <button
    onClick={() => {
      // Only allow management if user-added
      if (selectedPlace.source === 'user') {
        setShowManageModal(true);
        analytics.categoryTagTapped(selectedPlace.name, selectedPlace.category);
      } else {
        // Curated places: tag is informational only
        return;
      }
    }}
    className={`
      inline-flex items-center gap-1 px-2.5 py-1 rounded-xl 
      text-xs font-semibold border transition-all
      ${selectedPlace.source === 'user' 
        ? 'hover:scale-105 hover:shadow-sm active:scale-98 cursor-pointer' 
        : 'cursor-default'
      }
      ${categoryStyles[selectedPlace.category].bg}
      ${categoryStyles[selectedPlace.category].border}
      ${categoryStyles[selectedPlace.category].text}
    `}
  >
    <span className="text-sm">{categoryStyles[selectedPlace.category].icon}</span>
    <span>{selectedPlace.category}</span>
  </button>
  
  {/* Favorite */}
  <button
    onClick={handleFavoriteToggle}
    className="ml-auto p-1.5 hover:bg-slate-100 rounded-full transition-colors"
  >
    <Heart 
      className={`w-5 h-5 ${isFavorite ? 'fill-pink-500 text-pink-500' : 'text-slate-400'}`} 
    />
  </button>
</div>
```

**Key Changes:**
1. **Removed:** Full-width "Saved in [Category]" button
2. **Removed:** Separate "Remove from Collection" button  
3. **Added:** Inline category tag in metadata row
4. **Added:** Favorite button moves to right side of same row
5. **Result:** Save button area now only shows for unsaved places

---

## Component Breakdown

### New Component: CollectionManageModal

**Purpose:** Unified modal for changing category or removing place from collection

**Visual Design (Radio Button Style):**
```
┌────────────────────────────────────────┐
│  Manage Collection                     │
│                                        │
│  Scottish Design Exchange              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                        │
│  Change category:                      │
│                                        │
│  ○  🍽️  Food                          │
│  ○  ☕  Coffee                         │
│  ●  🛍️  Shopping (Current)            │ ← Selected
│  ○  📸  Sites                          │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  🗑️  Remove from Collection      │ │ ← Destructive action
│  └──────────────────────────────────┘ │
│                                        │
│  [Cancel]              [Update]        │
└────────────────────────────────────────┘
```

**Component Code:**
```typescript
interface CollectionManageModalProps {
  place: Place;
  currentCategory: Category;
  onChangeCategory: (newCategory: Category) => void;
  onRemove: () => void;
  onCancel: () => void;
}

const CollectionManageModal: React.FC<CollectionManageModalProps> = ({
  place,
  currentCategory,
  onChangeCategory,
  onRemove,
  onCancel,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>(currentCategory);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  const categoryOptions: Array<{ value: Category; icon: string; label: string }> = [
    { value: 'Food', icon: '🍽️', label: 'Food' },
    { value: 'Coffee', icon: '☕', label: 'Coffee' },
    { value: 'Shopping', icon: '🛍️', label: 'Shopping' },
    { value: 'Sites', icon: '📸', label: 'Sites' },
  ];
  
  const handleUpdate = () => {
    if (selectedCategory !== currentCategory) {
      onChangeCategory(selectedCategory);
    } else {
      onCancel(); // No change, just close
    }
  };
  
  if (showRemoveConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRemoveConfirm(false)} />
        
        {/* Confirm Modal */}
        <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">Remove Place?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to remove <span className="font-semibold text-slate-700">{place.name}</span> from your collection?
            </p>
            
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRemove();
                  setShowRemoveConfirm(false);
                }}
                className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col">
          {/* Header */}
          <h3 className="text-xl font-bold text-slate-900 mb-1">Manage Collection</h3>
          <p className="text-sm text-slate-600 mb-4">{place.name}</p>
          
          <div className="h-px bg-slate-200 mb-4" />
          
          {/* Category Selection */}
          <p className="text-sm font-semibold text-slate-700 mb-3">Change category:</p>
          
          <div className="space-y-2 mb-6">
            {categoryOptions.map((option) => {
              const isSelected = selectedCategory === option.value;
              const styles = categoryStyles[option.value];
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedCategory(option.value);
                    analytics.categoryChangeStarted(place.name, currentCategory, option.value);
                  }}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                    ${isSelected 
                      ? `${styles.bg} ${styles.border} ${styles.text}` 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  {/* Radio Circle */}
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${isSelected ? `${styles.border} ${styles.bg}` : 'border-slate-300'}
                  `}>
                    {isSelected && (
                      <div className={`w-2.5 h-2.5 rounded-full ${styles.text.replace('text-', 'bg-')}`} />
                    )}
                  </div>
                  
                  {/* Icon & Label */}
                  <span className="text-lg">{option.icon}</span>
                  <span className="font-semibold">{option.label}</span>
                  {option.value === currentCategory && (
                    <span className="ml-auto text-xs text-slate-500">(Current)</span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Remove Button */}
          <button
            onClick={() => setShowRemoveConfirm(true)}
            className="w-full bg-white border-2 border-red-200 text-red-600 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300 active:scale-98 transition-all mb-4"
          >
            <Trash2 className="w-4 h-4" />
            Remove from Collection
          </button>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-white border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={selectedCategory === currentCategory}
              className="flex-1 py-3 px-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              {selectedCategory === currentCategory ? 'No Change' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## Implementation Plan

### Phase 1: Category Tag Component (60 min)

**Step 1.1: Create category styles mapping (15 min)**
```typescript
// Add to App.tsx or new file: categoryStyles.ts
const categoryStyles: Record<Category, {
  bg: string;
  border: string;
  text: string;
  icon: string;
}> = {
  Food: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    icon: '🍽️'
  },
  Coffee: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-900',
    icon: '☕'
  },
  Shopping: {
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-900',
    icon: '🛍️'
  },
  Sites: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    icon: '📸'
  }
};
```

**Step 1.2: Update detail view metadata row (20 min)**
- Locate distance/favorite section
- Add category tag inline
- Make tag tappable (only for user-added places)
- Position favorite button at right

**Step 1.3: Remove old saved status UI (10 min)**
- Remove full-width green "Saved in [Category]" button
- Remove separate "Remove from Collection" button
- Clean up conditional rendering

**Step 1.4: Test tag appearance (15 min)**
- Verify all 4 categories show correct colors
- Check hover/active states
- Test on curated vs user-added places
- Verify responsive behavior

**Acceptance Criteria:**
- [ ] Category tag appears inline with distance
- [ ] Each category has distinct light color
- [ ] Tag is tappable for user-added places
- [ ] Tag is informational only for curated places
- [ ] Favorite button positioned at right
- [ ] Old green button removed

---

### Phase 2: Collection Manage Modal (90 min)

**Step 2.1: Create CollectionManageModal component (40 min)**
- Create new component file or add to App.tsx
- Implement radio button category selection
- Add remove button
- Add cancel/update actions
- Style with proper colors and spacing

**Step 2.2: Add modal state management (15 min)**
```typescript
const [showManageModal, setShowManageModal] = useState(false);
```

**Step 2.3: Wire up modal triggers (15 min)**
- Category tag onClick → setShowManageModal(true)
- Modal onCancel → setShowManageModal(false)
- Modal onUpdate → handleCategoryChange()
- Modal onRemove → handleDeletePlace()

**Step 2.4: Implement category change logic (15 min)**
```typescript
const handleCategoryChange = (newCategory: Category) => {
  if (!selectedPlace) return;
  
  const updatedPlace = { ...selectedPlace, category: newCategory };
  
  // Update in userPlaces
  const updatedPlaces = userPlaces.map(p => 
    p.id === selectedPlace.id ? updatedPlace : p
  );
  
  setUserPlaces(updatedPlaces);
  localStorage.setItem('amble_user_places', JSON.stringify(updatedPlaces));
  
  // Update selected place
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
    newCategory
  );
};
```

**Step 2.5: Test modal interactions (5 min)**
- Open modal from tag
- Select different category
- Update and verify change
- Test remove flow
- Test cancel

**Acceptance Criteria:**
- [ ] Tapping category tag opens modal
- [ ] Modal shows current category selected
- [ ] Can select different category via radio buttons
- [ ] Update button changes category
- [ ] Remove button triggers delete confirmation
- [ ] Cancel button closes without changes
- [ ] Toast confirms category change

---

### Phase 3: Remove Confirmation Flow (30 min)

**Step 3.1: Add nested confirmation state (5 min)**
```typescript
const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
```

**Step 3.2: Implement confirmation modal (15 min)**
- Reuse existing DeleteConfirmModal or create nested view
- Show when user clicks "Remove from Collection"
- Confirm → Remove place and close both modals
- Cancel → Return to manage modal

**Step 3.3: Wire up remove flow (10 min)**
```typescript
const handleRemoveFromModal = () => {
  // Remove place
  const updatedPlaces = userPlaces.filter(p => p.id !== selectedPlace.id);
  setUserPlaces(updatedPlaces);
  localStorage.setItem('amble_user_places', JSON.stringify(updatedPlaces));
  
  // Remove from favorites if present
  if (favorites.includes(selectedPlace.id)) {
    const updatedFavorites = favorites.filter(id => id !== selectedPlace.id);
    setFavorites(updatedFavorites);
    localStorage.setItem('amble_favorites', JSON.stringify(updatedFavorites));
  }
  
  // Close modals
  setShowManageModal(false);
  setShowRemoveConfirm(false);
  
  // Navigate back
  navigateBack();
  
  // Toast
  setToast({
    message: 'Removed from collection',
  });
  
  // Analytics
  analytics.placeRemoved(selectedPlace.id, selectedPlace.category);
};
```

**Acceptance Criteria:**
- [ ] Remove button shows confirmation modal
- [ ] Confirmation explains what will be removed
- [ ] Confirm removes place and navigates back
- [ ] Cancel returns to manage modal
- [ ] Place removed from localStorage
- [ ] Place removed from favorites if applicable

---

### Phase 4: Analytics & Polish (30 min)

**Step 4.1: Add analytics events (15 min)**
```typescript
// In services/analytics.ts
export const analytics = {
  // ... existing events ...
  
  categoryTagTapped: (placeName: string, currentCategory: Category) =>
    track({
      name: 'category_tag_tapped',
      data: { placeName, currentCategory }
    }),
  
  categoryChangeStarted: (placeName: string, fromCategory: Category, toCategory: Category) =>
    track({
      name: 'category_change_started',
      data: { placeName, fromCategory, toCategory }
    }),
  
  categoryChanged: (placeName: string, fromCategory: Category, toCategory: Category) =>
    track({
      name: 'category_changed',
      data: { placeName, fromCategory, toCategory }
    }),
  
  placeRemovedViaModal: (placeId: string, category: Category) =>
    track({
      name: 'place_removed_via_modal',
      data: { placeId, category }
    }),
};
```

**Step 4.2: Add transitions and animations (10 min)**
- Modal slide-in animation
- Category tag hover effect
- Radio button selection transition
- Toast slide up

**Step 4.3: Final polish (5 min)**
- Check all spacing is consistent
- Verify color contrast (WCAG AA)
- Test on smallest screen (iPhone SE)
- Verify touch targets (44x44px minimum)

**Acceptance Criteria:**
- [ ] All interactions tracked in analytics
- [ ] Animations smooth and professional
- [ ] Colors accessible (sufficient contrast)
- [ ] Touch targets adequate size
- [ ] Works on small screens

---

## Code Changes Required

### File: App.tsx

**Additions:**
1. Category styles mapping (top of file)
2. CollectionManageModal component
3. showManageModal state
4. handleCategoryChange function
5. Updated metadata row in renderDetail
6. Modal render in main return

**Removals:**
1. Full-width "Saved in [Category]" button section
2. Separate "Remove from Collection" button section

**Modifications:**
1. Detail view layout structure
2. Save button area (only shows for unsaved places)

### File: services/analytics.ts

**Additions:**
```typescript
categoryTagTapped: (placeName, currentCategory) => { ... }
categoryChangeStarted: (placeName, fromCategory, toCategory) => { ... }
categoryChanged: (placeName, fromCategory, toCategory) => { ... }
placeRemovedViaModal: (placeId, category) => { ... }
```

### File: types.ts

**No changes required** (all types already exist)

---

## Testing Checklist

### Visual Testing

**Category Tags:**
- [ ] Food tag: Light amber background, amber text, 🍽️ icon
- [ ] Coffee tag: Light orange background, orange text, ☕ icon
- [ ] Shopping tag: Light pink background, pink text, 🛍️ icon
- [ ] Sites tag: Light emerald background, emerald text, 📸 icon
- [ ] Tags are compact and inline with distance
- [ ] Favorite button positioned at right
- [ ] Tag hover effect works (scale 1.05)

**Detail View Layout:**
- [ ] Metadata row: Distance | Tag | Favorite (well-spaced)
- [ ] Old green button removed
- [ ] Old remove button removed
- [ ] Save button only shows for unsaved places
- [ ] Layout is clean and scannable

**Modal Design:**
- [ ] Modal opens with slide/zoom animation
- [ ] Current category is pre-selected
- [ ] Radio buttons have clear selected state
- [ ] Remove button has destructive styling (red)
- [ ] Cancel/Update buttons clearly different
- [ ] Modal backdrop blurs background

### Functional Testing

**Category Tag Interaction:**
- [ ] Tapping tag on user-added place opens modal
- [ ] Tapping tag on curated place does nothing
- [ ] Tag shows correct category for all places
- [ ] Tag appears on all detail views (curated + user-added)

**Category Change Flow:**
- [ ] Open modal → Select new category → Tap Update
- [ ] Place moves to new category
- [ ] Toast confirms: "Moved to [Category]!"
- [ ] Tag updates to show new category
- [ ] Place appears in new category list
- [ ] Change persists after app reload

**Remove Flow:**
- [ ] Open modal → Tap Remove → Confirm
- [ ] Place removed from collection
- [ ] Navigates back to previous view
- [ ] Toast confirms: "Removed from collection"
- [ ] Place disappears from all lists
- [ ] Removal persists after app reload

**Cancel Behavior:**
- [ ] Cancel in manage modal → Modal closes, no changes
- [ ] Cancel in remove confirm → Returns to manage modal
- [ ] Backdrop tap closes modal
- [ ] No changes saved when cancelled

### Edge Cases

**Multiple Category Changes:**
- [ ] Change Food → Coffee → Shopping (rapid changes)
- [ ] Change category, close app, reopen (persists)
- [ ] Change category while place is favorited (keeps favorite)

**Curated vs User-Added:**
- [ ] Curated place shows tag (informational)
- [ ] Curated tag is not tappable
- [ ] User-added tag is tappable
- [ ] Styling is identical (only interaction differs)

**Analytics Tracking:**
- [ ] Tag tap tracked with place name + category
- [ ] Category change tracked with from/to
- [ ] Remove tracked with place ID + category
- [ ] Events appear in console

### Performance

- [ ] Modal opens instantly (< 100ms)
- [ ] Category change updates UI immediately
- [ ] No lag when tapping tag
- [ ] Animations smooth (60fps)

### Accessibility

- [ ] Tag has adequate contrast
- [ ] Radio buttons keyboard accessible
- [ ] Modal can be closed with Esc key
- [ ] Touch targets 44x44px minimum
- [ ] Screen reader friendly (test with VoiceOver)

---

## Analytics & Tracking

### Events to Track

**Event 1: Category Tag Tapped**
```typescript
analytics.categoryTagTapped(placeName, currentCategory);

// Data captured:
{
  name: 'category_tag_tapped',
  data: {
    placeName: 'Scottish Design Exchange',
    currentCategory: 'Shopping'
  }
}
```

**Event 2: Category Change Started**
```typescript
analytics.categoryChangeStarted(placeName, fromCategory, toCategory);

// Data captured:
{
  name: 'category_change_started',
  data: {
    placeName: 'Scottish Design Exchange',
    fromCategory: 'Shopping',
    toCategory: 'Sites'
  }
}
```

**Event 3: Category Changed (Completed)**
```typescript
analytics.categoryChanged(placeName, fromCategory, toCategory);

// Data captured:
{
  name: 'category_changed',
  data: {
    placeName: 'Scottish Design Exchange',
    fromCategory: 'Shopping',
    toCategory: 'Sites'
  }
}
```

**Event 4: Place Removed Via Modal**
```typescript
analytics.placeRemovedViaModal(placeId, category);

// Data captured:
{
  name: 'place_removed_via_modal',
  data: {
    placeId: 'user-ChIJ...',
    category: 'Shopping'
  }
}
```

### Analytics Insights

**Track these metrics:**
- Category tag tap rate (% of users who interact)
- Most common category changes (e.g., Shopping → Sites)
- Removal rate from modal vs. detail view button (before removal)
- Time to complete category change (modal open → update)

---

## Success Criteria

The redesign will be considered **COMPLETE** when:

1. ✅ Category tag appears inline with distance (compact, scannable)
2. ✅ Each category has distinct light-colored badge
3. ✅ All places show category (curated and user-added)
4. ✅ Tag is tappable for user-added places (opens modal)
5. ✅ Tag is informational for curated places (not tappable)
6. ✅ Modal allows changing category via radio buttons
7. ✅ Modal allows removing place
8. ✅ Old green button and separate remove button removed
9. ✅ Space saved (~80px vertical) for better above-fold UX
10. ✅ All analytics events tracked

---

## Timeline

**Target Completion:** 48 hours  
**Estimated Effort:** 3.5 hours

**Breakdown:**
- Phase 1 (Category Tag): 60 minutes
- Phase 2 (Manage Modal): 90 minutes
- Phase 3 (Remove Confirmation): 30 minutes
- Phase 4 (Analytics & Polish): 30 minutes
- Buffer: 20 minutes

---

## Before & After Comparison

### Before (Current):
```
Detail View Space Usage:
- Photo: 280px
- Title/Address: 100px
- Distance/Favorite: 40px
- ❌ Saved Status Button: 80px
- ❌ Remove Button: 60px
- Go Now: 60px
---
Total above fold: ~620px (scrolling required)
```

### After (New):
```
Detail View Space Usage:
- Photo: 280px
- Title/Address: 100px
- Distance/Tag/Favorite: 40px (same row)
- Save Button: 0px (hidden when saved)
- Go Now: 60px
---
Total above fold: ~480px (140px saved!)
```

**Result:** More content above fold, cleaner hierarchy, better UX

---

## Related Documentation

- Previous Change Order: `add-location-ux-improvements-change-order.md`
- Bug Fix: `save-button-bug-and-layout-fix.md`
- Original PRD: `add-location-prd.md`

---

## Rollback Plan

If issues arise:

**Rollback Steps:**
1. Revert commit with category tag changes
2. Restore old "Saved in [Category]" button
3. Restore "Remove from Collection" button
4. Deploy previous version
5. Debug offline

**Note:** This is a pure UI change with no data model changes, so rollback is safe.

---

**End of Change Order**

**Next Step:** Engineer to review, ask questions, then implement Phase 1 → Phase 2 → Phase 3 → Phase 4 in sequence.