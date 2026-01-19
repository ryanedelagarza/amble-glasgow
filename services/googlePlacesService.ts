import { Coordinates, GooglePlaceResult, Category } from '../types';

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
    return data.results?.slice(0, 5) || [];
    
  } catch (error) {
    console.error('Google Places search error:', error);
    throw error;
  }
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
