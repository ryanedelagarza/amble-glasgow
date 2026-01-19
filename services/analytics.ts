/**
 * Analytics Service - Lightweight abstraction layer
 * 
 * Currently logs to console for development.
 * To connect to a real analytics provider (GA4, Mixpanel, etc.),
 * update the `sendEvent` function to send to your provider.
 */

// Event types for type safety
export type AnalyticsEvent = 
  | { name: 'add_location_button_tapped' }
  | { name: 'search_initiated'; data: { query: string; queryLength: number } }
  | { name: 'search_completed'; data: { resultCount: number; hasTopResult: boolean; timeToResults: number } }
  | { name: 'result_selected'; data: { position: number; placeId: string; placeName: string } }
  | { name: 'place_added'; data: { placeId: string; category: string; source: 'user' | 'curated' } }
  | { name: 'place_removed'; data: { placeId: string; category: string } }
  | { name: 'search_error'; data: { errorType: string; errorMessage: string } };

// Configuration
const ANALYTICS_ENABLED = true;
const LOG_TO_CONSOLE = true; // Set to false in production when connected to real provider

/**
 * Internal function to send events
 * Update this to integrate with your analytics provider
 */
function sendEvent(eventName: string, eventData?: Record<string, unknown>) {
  if (!ANALYTICS_ENABLED) return;

  // Console logging for development
  if (LOG_TO_CONSOLE) {
    const timestamp = new Date().toISOString();
    console.log(
      `%c[Analytics] ${eventName}`,
      'color: #8b5cf6; font-weight: bold;',
      eventData ? eventData : '',
      `@ ${timestamp}`
    );
  }

  // TODO: Add your analytics provider here
  // Example for Google Analytics 4:
  // if (typeof gtag !== 'undefined') {
  //   gtag('event', eventName, eventData);
  // }
  
  // Example for Mixpanel:
  // if (typeof mixpanel !== 'undefined') {
  //   mixpanel.track(eventName, eventData);
  // }
}

/**
 * Track an analytics event
 */
export function track(event: AnalyticsEvent) {
  const { name, ...rest } = event;
  const data = 'data' in rest ? rest.data : undefined;
  sendEvent(name, data as Record<string, unknown> | undefined);
}

/**
 * Convenience functions for common events
 */
export const analytics = {
  // Add Location flow events
  addLocationButtonTapped: () => {
    track({ name: 'add_location_button_tapped' });
  },

  searchInitiated: (query: string) => {
    track({ 
      name: 'search_initiated', 
      data: { query, queryLength: query.length } 
    });
  },

  searchCompleted: (resultCount: number, timeToResults: number) => {
    track({ 
      name: 'search_completed', 
      data: { 
        resultCount, 
        hasTopResult: resultCount > 0, 
        timeToResults 
      } 
    });
  },

  resultSelected: (position: number, placeId: string, placeName: string) => {
    track({ 
      name: 'result_selected', 
      data: { position, placeId, placeName } 
    });
  },

  placeAdded: (placeId: string, category: string) => {
    track({ 
      name: 'place_added', 
      data: { placeId, category, source: 'user' } 
    });
  },

  placeRemoved: (placeId: string, category: string) => {
    track({ 
      name: 'place_removed', 
      data: { placeId, category } 
    });
  },

  searchError: (errorType: string, errorMessage: string) => {
    track({ 
      name: 'search_error', 
      data: { errorType, errorMessage } 
    });
  },
};

export default analytics;
