import { Coordinates, GooglePlaceResult, Category } from '../types';

const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

// Custom error types for specific handling
export class PlacesApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'PlacesApiError';
  }
}

export class OfflineError extends Error {
  constructor() {
    super('No internet connection');
    this.name = 'OfflineError';
  }
}

interface SearchPlacesParams {
  query: string;
  location: Coordinates;
  radius?: number; // Default 5000 meters (5km)
}

// --- Result Cache with 5-minute TTL ---
interface CacheEntry {
  results: GooglePlaceResult[];
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const searchCache = new Map<string, CacheEntry>();

// Generate cache key from search params
function getCacheKey(params: SearchPlacesParams): string {
  const { query, location, radius = 5000 } = params;
  // Round location to 4 decimal places to allow for slight variations
  const lat = location.lat.toFixed(4);
  const lng = location.lng.toFixed(4);
  return `${query.toLowerCase().trim()}|${lat},${lng}|${radius}`;
}

// Check if cache entry is still valid
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

// Get cached results if available and valid
function getCachedResults(params: SearchPlacesParams): GooglePlaceResult[] | null {
  const key = getCacheKey(params);
  const entry = searchCache.get(key);
  
  if (entry && isCacheValid(entry)) {
    console.log('[Cache] Hit for query:', params.query);
    return entry.results;
  }
  
  // Remove expired entry if exists
  if (entry) {
    searchCache.delete(key);
  }
  
  return null;
}

// Store results in cache
function cacheResults(params: SearchPlacesParams, results: GooglePlaceResult[]): void {
  const key = getCacheKey(params);
  searchCache.set(key, {
    results,
    timestamp: Date.now(),
  });
  console.log('[Cache] Stored results for query:', params.query);
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Internal fetch function (single attempt)
async function fetchPlaces(url: URL): Promise<GooglePlaceResult[]> {
  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new PlacesApiError('HTTP_ERROR', `Network error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Handle specific API status codes
  switch (data.status) {
    case 'OK':
    case 'ZERO_RESULTS':
      return data.results?.slice(0, 5) || [];
    
    case 'OVER_QUERY_LIMIT':
      throw new PlacesApiError('OVER_QUERY_LIMIT', 'Too many searches. Please try again in a few minutes.');
    
    case 'REQUEST_DENIED':
      throw new PlacesApiError('REQUEST_DENIED', 'Search service unavailable. Please try again later.');
    
    case 'INVALID_REQUEST':
      throw new PlacesApiError('INVALID_REQUEST', 'Invalid search. Please try a different query.');
    
    default:
      throw new PlacesApiError(data.status, `Search failed: ${data.status}`);
  }
}

export async function searchPlaces(params: SearchPlacesParams): Promise<GooglePlaceResult[]> {
  const { query, location, radius = 5000 } = params;
  
  // Check cache first
  const cachedResults = getCachedResults(params);
  if (cachedResults !== null) {
    return cachedResults;
  }
  
  // Check for offline status
  if (!navigator.onLine) {
    throw new OfflineError();
  }
  
  const url = new URL(`${PLACES_API_URL}/textsearch/json`);
  url.searchParams.append('query', query);
  url.searchParams.append('location', `${location.lat},${location.lng}`);
  url.searchParams.append('radius', radius.toString());
  url.searchParams.append('key', GOOGLE_PLACES_API_KEY);
  url.searchParams.append('region', 'uk'); // Bias to UK results
  
  // Retry configuration
  const maxRetries = 2;
  const baseDelay = 1000; // 1 second
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const results = await fetchPlaces(url);
      // Cache successful results
      cacheResults(params, results);
      return results;
      
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry for certain error types
      if (error instanceof OfflineError) {
        throw error;
      }
      
      if (error instanceof PlacesApiError) {
        // Don't retry for quota or invalid request errors
        if (['OVER_QUERY_LIMIT', 'INVALID_REQUEST', 'REQUEST_DENIED'].includes(error.code)) {
          throw error;
        }
      }
      
      // Check if we should retry
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s
        const retryDelay = baseDelay * Math.pow(2, attempt);
        console.log(`Search attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`);
        await delay(retryDelay);
        
        // Re-check online status before retry
        if (!navigator.onLine) {
          throw new OfflineError();
        }
      }
    }
  }
  
  // All retries exhausted
  if (lastError instanceof PlacesApiError || lastError instanceof OfflineError) {
    throw lastError;
  }
  
  // Handle network/fetch errors
  if (lastError instanceof TypeError && lastError.message.includes('fetch')) {
    throw new OfflineError();
  }
  
  console.error('Google Places search error after retries:', lastError);
  throw new PlacesApiError('UNKNOWN', 'Something went wrong. Please try again.');
}

export function getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
  return `${PLACES_API_URL}/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
}

// Category mapping from Google Places types to Amble categories
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
  'home_goods_store': 'Shopping',
  'furniture_store': 'Shopping',
  'gift_shop': 'Shopping',
  
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

const DEFAULT_CATEGORY: Category = 'Sites';

export function assignCategory(googleTypes: string[]): Category {
  // Iterate through Google types and return the first matching category
  for (const type of googleTypes) {
    if (categoryMapping[type]) {
      return categoryMapping[type];
    }
  }
  return DEFAULT_CATEGORY;
}
