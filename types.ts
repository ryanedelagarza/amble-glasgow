export interface Coordinates {
  lat: number;
  lng: number;
}

export type Category = 'Food' | 'Coffee' | 'Shopping' | 'Sites';

export interface Place {
  id: string;
  name: string;
  category: Category;
  description: string; // Brief default description
  address: string;
  coordinates: Coordinates;
  priority: boolean; // "Curator's Pick"
  isOpen?: boolean; // Mocked status
  images: string[]; // Array of image URLs
  
  // User-generated place fields
  source?: 'curated' | 'user';        // Track origin
  googlePlaceId?: string;             // Link to Google Places
  addedAt?: string;                   // ISO timestamp
}

// Google Places API result type
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

export interface UserPreferences {
  bio: string;
  hasOnboarded: boolean;
}

export enum DistanceMode {
  FROM_ME = 'FROM_ME',
  FROM_HOTEL = 'FROM_HOTEL',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  relatedPlaceId?: string; // If the chat suggests a specific place from our DB
}
