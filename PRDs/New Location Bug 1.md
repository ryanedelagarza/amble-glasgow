# BUG TICKET: Add Location Search Failing to Return Results

**Priority:** P0 - Critical  
**Status:** Open  
**Assigned To:** AI Copilot Engineer (Claude Opus 4.5)  
**Reported By:** Product Management  
**Date:** January 19, 2026  
**Environment:** Production (glasgow.vercel.app)

---

## Executive Summary

The Add Location feature's search functionality is completely failing in production. Users can navigate to the search screen, input queries, and see loading states, but searches are returning generic error messages instead of place results. This blocks the entire feature and prevents users from adding new locations.

**User Impact:** 100% of search attempts fail. Feature is effectively broken.

---

## Bug Description

### What's Happening

1. User taps **[+] ADD** button in bottom navigation ✅ Works
2. Search screen appears with text input ✅ Works
3. User types query (e.g., "Scottish design exchange") ✅ Works
4. Debounced search triggers after 300ms ✅ Works (skeleton cards appear)
5. **❌ Search fails with generic error:** "Something went wrong. Please try again."
6. Error state displays with red alert icon and "Retry Search" button

### Expected Behavior

1. Google Places API search executes successfully
2. Results are ranked by Gemini AI
3. Results display as cards with photos, names, addresses, distances
4. User can tap a result to add it to their collection

### Actual Behavior

- No results ever display
- Generic error state appears after ~2 seconds
- Console may contain error messages (need to check)
- Retry attempts also fail

---

## Investigation Scope

### Primary Investigation Areas

#### 1. **Google Places API Integration** (HIGH PRIORITY)

**File:** `services/googlePlacesService.ts`

**Questions to Answer:**
- Is the API key (`VITE_GOOGLE_PLACES_API_KEY`) properly configured in production environment?
- Is the API key valid and has not expired?
- Are there HTTP referrer restrictions blocking requests from `glasgow.vercel.app`?
- Is the Places API enabled in Google Cloud Console?
- Are we hitting rate limits or quota restrictions?
- Is the API request URL formatted correctly?
- Are CORS headers properly configured?

**Specific Checks:**
```typescript
// Verify these are working:
1. const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
2. API endpoint: https://maps.googleapis.com/maps/api/place/textsearch/json
3. Query parameters: query, location, radius, key, region
4. Response status codes
5. Error response structure from Google
```

**Action Items:**
- [ ] Log actual API key value (first/last 4 chars only) to verify it's loaded
- [ ] Log complete request URL to verify formatting
- [ ] Log full error responses from Google Places API
- [ ] Verify API key restrictions in Google Cloud Console
- [ ] Check quota usage in Google Cloud Console
- [ ] Test API key with direct cURL request outside of app

---

#### 2. **Gemini AI Ranking Integration** (MEDIUM PRIORITY)

**File:** `services/geminiService.ts` (extended `rankSearchResults` function)

**Questions to Answer:**
- Does the search fail at Google Places stage, or during Gemini ranking?
- Is Gemini API being called at all?
- Are we properly handling Gemini failures and falling back to distance-based sorting?
- Is the Gemini API key valid?

**Specific Checks:**
```typescript
// Verify fallback logic works:
try {
  const rankedIds = await rankSearchResults(...);
} catch (error) {
  console.error('Gemini ranking error:', error);
  // Should fallback to distance-based sorting
  return results.sort((a, b) => ...).map(r => r.place_id);
}
```

**Action Items:**
- [ ] Add logging before Gemini call to confirm Google Places succeeded
- [ ] Add logging in Gemini catch block to confirm fallback executes
- [ ] Test if search works when Gemini is completely bypassed
- [ ] Verify Gemini API key is valid

---

#### 3. **Error Handling & Propagation** (MEDIUM PRIORITY)

**File:** `App.tsx` (renderAddLocation, handleSearch)

**Questions to Answer:**
- Are errors being caught and logged properly?
- Is error state being set correctly?
- Are we showing the right error message based on error type?
- Are errors being swallowed somewhere in the promise chain?

**Specific Checks:**
```typescript
// In handleSearch function:
try {
  const rawResults = await searchPlaces(...);
  // Does this ever execute?
  
  const rankedIds = await rankSearchResults(...);
  // Does this ever execute?
  
} catch (err) {
  console.error('Search error:', err); // Is this logging?
  setSearchError('...'); // Is this setting correct error?
}
```

**Action Items:**
- [ ] Add console.log at start of handleSearch
- [ ] Add console.log after successful searchPlaces call
- [ ] Add console.log after successful rankSearchResults call
- [ ] Verify error instanceof checks are working
- [ ] Confirm setSearchError is updating UI correctly

---

#### 4. **Network & CORS Issues** (LOW PRIORITY)

**Questions to Answer:**
- Are fetch requests being blocked by CORS?
- Are requests timing out?
- Is there a network connectivity issue?

**Action Items:**
- [ ] Check browser DevTools Network tab for failed requests
- [ ] Verify CORS headers in responses
- [ ] Check for timeout errors

---

### Secondary Investigation Areas

#### 5. **Environment Variables**

**Questions to Answer:**
- Are environment variables properly loaded in production build?
- Is `VITE_GOOGLE_PLACES_API_KEY` present?
- Is `VITE_GOOGLE_AI_API_KEY` present?

**Action Items:**
- [ ] Add startup logging to verify env vars are loaded
- [ ] Confirm Vercel environment variables are set correctly
- [ ] Verify variable names match exactly (case-sensitive)

---

#### 6. **TypeScript Type Issues**

**Questions to Answer:**
- Are TypeScript interfaces matching actual API responses?
- Are we correctly transforming Google Places results?

**Action Items:**
- [ ] Verify GooglePlaceResult interface matches API response
- [ ] Check for any TypeScript errors in console

---

## Debugging Strategy

### Phase 1: Add Comprehensive Logging (15 minutes)

Add logging to trace the entire search flow:

```typescript
// In App.tsx handleSearch
const handleSearch = async () => {
  console.log('[DEBUG] Search initiated:', { 
    query: searchQuery, 
    userLocation, 
    hotelLocation 
  });
  
  setIsSearching(true);
  setSearchError(null);
  const startTime = Date.now();
  
  try {
    // Check cache
    console.log('[DEBUG] Checking cache...');
    // ... cache logic
    
    // Search Google Places
    console.log('[DEBUG] Calling Google Places API...');
    const rawResults = await searchPlaces({
      query: searchQuery.trim(),
      location: userLocation || HOTEL_COORDINATES,
      radius: 5000,
    });
    console.log('[DEBUG] Google Places returned:', rawResults.length, 'results');
    console.log('[DEBUG] First result:', rawResults[0]);
    
    if (rawResults.length === 0) {
      console.log('[DEBUG] Zero results, showing empty state');
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    // Rank with AI
    console.log('[DEBUG] Calling Gemini for ranking...');
    const rankedIds = await rankSearchResults(
      searchQuery,
      userPreferences.bio,
      userLocation || HOTEL_COORDINATES,
      rawResults
    );
    console.log('[DEBUG] Gemini returned ranked IDs:', rankedIds);
    
    // Reorder results
    const rankedResults = rankedIds
      .map(id => rawResults.find(r => r.place_id === id))
      .filter(Boolean) as GooglePlaceResult[];
    
    console.log('[DEBUG] Final ranked results:', rankedResults.length);
    setSearchResults(rankedResults);
    
    const timeToResults = Date.now() - startTime;
    console.log('[DEBUG] Search completed in', timeToResults, 'ms');
    analytics.searchCompleted(rankedResults.length, timeToResults);
    
  } catch (err) {
    console.error('[DEBUG] Search error caught:', err);
    console.error('[DEBUG] Error type:', err.constructor.name);
    console.error('[DEBUG] Error message:', err.message);
    console.error('[DEBUG] Full error:', err);
    
    // Error handling logic
    if (err instanceof OfflineError) {
      console.log('[DEBUG] Setting offline error state');
      setSearchError('offline');
    } else if (err instanceof PlacesApiError) {
      console.log('[DEBUG] Setting Places API error state:', err.code);
      setSearchError(err.code === 'OVER_QUERY_LIMIT' ? 'quota' : 'generic');
    } else {
      console.log('[DEBUG] Setting generic error state');
      setSearchError('generic');
    }
    
    analytics.searchError(
      err instanceof PlacesApiError ? err.code : 'UNKNOWN',
      err.message
    );
  } finally {
    console.log('[DEBUG] Setting isSearching to false');
    setIsSearching(false);
  }
};
```

```typescript
// In services/googlePlacesService.ts
export async function searchPlaces(params: SearchPlacesParams): Promise<GooglePlaceResult[]> {
  console.log('[PLACES API] Request params:', params);
  
  const { query, location, radius = 5000 } = params;
  
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  console.log('[PLACES API] API Key loaded:', apiKey ? 
    `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 
    'MISSING!'
  );
  
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }
  
  const url = new URL(`${PLACES_API_URL}/textsearch/json`);
  url.searchParams.append('query', query);
  url.searchParams.append('location', `${location.lat},${location.lng}`);
  url.searchParams.append('radius', radius.toString());
  url.searchParams.append('key', apiKey);
  url.searchParams.append('region', 'uk');
  
  console.log('[PLACES API] Request URL:', url.toString().replace(apiKey, 'API_KEY_HIDDEN'));
  
  try {
    console.log('[PLACES API] Fetching...');
    const response = await fetch(url.toString());
    console.log('[PLACES API] Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error('[PLACES API] HTTP error:', response.status);
      throw new PlacesApiError('HTTP_ERROR', `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[PLACES API] Response data:', {
      status: data.status,
      resultsCount: data.results?.length || 0,
      errorMessage: data.error_message
    });
    
    if (data.status === 'ZERO_RESULTS') {
      console.log('[PLACES API] Zero results returned');
      return [];
    }
    
    if (data.status !== 'OK') {
      console.error('[PLACES API] API returned error status:', data.status, data.error_message);
      throw new PlacesApiError(data.status, data.error_message || 'Unknown error');
    }
    
    console.log('[PLACES API] Success! Returning', data.results.length, 'results');
    return data.results.slice(0, 5);
    
  } catch (error) {
    console.error('[PLACES API] Caught error:', error);
    throw error;
  }
}
```

### Phase 2: Test API Key Directly (5 minutes)

Test the Google Places API key with a direct request to confirm it works:

```bash
# Replace YOUR_API_KEY with actual key from Vercel env vars
curl "https://maps.googleapis.com/maps/api/place/textsearch/json?query=Scottish+Design+Exchange&location=55.8642,-4.2518&radius=5000&key=YOUR_API_KEY&region=uk"
```

Expected response:
- `status: "OK"`
- `results: [...]` with at least 1 result

If this fails, the API key is the problem.

### Phase 3: Simplified Test (10 minutes)

Create a minimal test that bypasses all complexity:

```typescript
// Temporary test function in App.tsx
const testGooglePlacesDirectly = async () => {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=coffee&location=55.8642,-4.2518&radius=5000&key=${apiKey}&region=uk`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('DIRECT TEST RESULT:', data);
    alert(`Status: ${data.status}, Results: ${data.results?.length || 0}`);
  } catch (error) {
    console.error('DIRECT TEST ERROR:', error);
    alert('Error: ' + error.message);
  }
};

// Add a button to trigger this test
<button onClick={testGooglePlacesDirectly}>Test API Direct</button>
```

This will tell us if the API itself works, independent of our service layer.

---

## Hypothesis & Likely Root Causes

Based on the symptoms, here are the most likely causes (ordered by probability):

### 1. **Missing or Invalid Google Places API Key** (80% probability)

**Symptoms:**
- Every search fails with generic error
- No variation in error message
- Happens consistently

**Evidence Needed:**
- Check Vercel environment variables
- Verify `VITE_GOOGLE_PLACES_API_KEY` is set
- Confirm API key is valid in Google Cloud Console

**Fix:**
- Set correct API key in Vercel
- Enable Places API in Google Cloud Console
- Configure HTTP referrer restrictions

---

### 2. **API Key Restrictions Blocking Production Domain** (15% probability)

**Symptoms:**
- Works in local dev, fails in production
- CORS or referrer-related errors in console

**Evidence Needed:**
- Check Google Cloud Console → Credentials → API key → Application restrictions
- Verify `glasgow.vercel.app` is in allowed referrers

**Fix:**
- Add `glasgow.vercel.app/*` to allowed HTTP referrers
- Add `*.vercel.app/*` for preview deployments

---

### 3. **Gemini Ranking Failure Without Proper Fallback** (3% probability)

**Symptoms:**
- Google Places succeeds but Gemini fails
- No fallback to distance-based sorting
- Error thrown from Gemini catch block

**Evidence Needed:**
- Log confirms Google Places returned results
- Log shows Gemini error
- Fallback logic not executing

**Fix:**
- Ensure try/catch around rankSearchResults works
- Return distance-sorted results on Gemini failure
- Don't throw errors from ranking step

---

### 4. **CORS or Network Issue** (2% probability)

**Symptoms:**
- Fetch requests blocked by browser
- CORS errors in console

**Evidence Needed:**
- Network tab shows CORS errors
- Preflight OPTIONS requests failing

**Fix:**
- Google Places API shouldn't have CORS issues (supports client-side calls)
- If present, may need to proxy through Vercel API route

---

## Complexity Assessment

### Is the Current Approach Overcomplicated?

**Current Flow:**
```
User Query → Google Places API → Gemini Ranking → Display Results
```

**Alternative (Simpler) Flow:**
```
User Query → Google Places API → Sort by Distance → Display Results
```

### Analysis

**Pros of Current Approach:**
- Better relevance (AI understands intent)
- Personalized to user bio/preferences
- "Best Match" badge adds value

**Cons of Current Approach:**
- Additional failure point (Gemini API)
- Slower response time (~1-2s extra)
- More complex error handling
- Higher API costs

### Recommendation

**For MVP/Debugging:** Temporarily simplify by removing Gemini ranking to isolate the issue.

**For Production:** Keep AI ranking but ensure robust fallback:
```typescript
try {
  const rankedIds = await rankSearchResults(...);
  return reorderByRankedIds(results, rankedIds);
} catch (error) {
  console.warn('AI ranking failed, falling back to distance sort:', error);
  return sortByDistance(results, userLocation);
}
```

This gives us the best of both worlds: intelligent ranking when available, reliable results when not.

---

## Action Plan for Engineer

### Step 1: Reproduce Issue (5 min)
- [ ] Deploy current code to staging
- [ ] Test search with "Scottish Design Exchange"
- [ ] Confirm error occurs
- [ ] Open browser DevTools console and Network tab

### Step 2: Add Diagnostic Logging (15 min)
- [ ] Add all logging from Phase 1 above
- [ ] Deploy to staging
- [ ] Test again and capture full console output
- [ ] Share console logs with Product Manager

### Step 3: Verify Environment Variables (5 min)
- [ ] Check Vercel project settings for `VITE_GOOGLE_PLACES_API_KEY`
- [ ] Verify API key is set and not empty
- [ ] Confirm API key format (should be ~40 characters)

### Step 4: Test API Key Directly (5 min)
- [ ] Use curl command from Phase 2
- [ ] Verify API returns `status: "OK"`
- [ ] If fails, investigate API key setup

### Step 5: Google Cloud Console Audit (10 min)
- [ ] Log into Google Cloud Console
- [ ] Navigate to APIs & Services → Credentials
- [ ] Verify Places API is enabled
- [ ] Check API key restrictions:
  - [ ] Application restrictions: HTTP referrers
  - [ ] Add `glasgow.vercel.app/*` if missing
  - [ ] API restrictions: Confirm "Places API" is selected
- [ ] Check quota usage (Quotas page)

### Step 6: Implement Fix (varies)
Based on findings:
- **If API key missing:** Add to Vercel env vars, redeploy
- **If API key invalid:** Generate new key, update Vercel, redeploy
- **If restrictions wrong:** Update in GCP, wait 5 min, test
- **If quota exceeded:** Increase quota or wait for reset
- **If code bug:** Fix error handling, add fallback, redeploy

### Step 7: Verify Fix (5 min)
- [ ] Test search in production
- [ ] Confirm results appear
- [ ] Test with multiple queries
- [ ] Verify analytics events fire correctly

### Step 8: Remove Debug Logging (5 min)
- [ ] Remove or reduce verbose console.logs
- [ ] Keep essential error logging
- [ ] Deploy final clean version

---

## Success Criteria

The bug will be considered **RESOLVED** when:

1. ✅ User can search for "Scottish Design Exchange" and see results
2. ✅ Results display with photos, names, addresses, distances
3. ✅ Top result shows "Best Match" badge
4. ✅ User can tap a result and add it to their collection
5. ✅ No error states appear for valid searches
6. ✅ Analytics events fire correctly
7. ✅ Search completes within 2 seconds on 4G

---

## Timeline

**Target Resolution:** 24 hours  
**Estimated Effort:** 1-2 hours (mostly Google Cloud Console config)

**Breakdown:**
- Investigation & Logging: 30 minutes
- Environment Variable Check: 15 minutes
- Google Cloud Console Fixes: 30 minutes
- Testing & Verification: 15 minutes
- Cleanup: 15 minutes

---

## Communication Plan

**Engineer should report back with:**

1. **Initial Investigation (2 hours):**
   - Console log output from Phase 1
   - Environment variable status
   - API key validity check results
   - Network tab screenshot if relevant

2. **Root Cause Found (4 hours):**
   - Specific issue identified
   - Proposed fix
   - Estimated time to implement

3. **Fix Deployed (6 hours):**
   - What was changed
   - Verification test results
   - Any follow-up items needed

---

## Related Documentation

- Original PRD: `add-location-prd.md`
- Implementation Learnings: `Add_Location_Feature_Learnings.md`
- Google Places API Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
- Gemini API Docs: (internal service documentation)

---

## Questions for Product Manager

Before starting work, please confirm:

1. **Do we have access to Google Cloud Console?** (Needed to verify API key settings)
2. **Do we have access to Vercel environment variables?** (Needed to verify key is set)
3. **Should we proceed with full AI ranking or simplify to distance-only for now?**
4. **Is there a budget/quota limit for Google Places API we should be aware of?**
5. **What's the priority vs. other work?** (P0 suggests drop everything)

---

**End of Ticket**

**Next Step:** Engineer to acknowledge ticket and begin Phase 1 investigation with diagnostic logging.