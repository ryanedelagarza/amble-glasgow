import { GoogleGenAI } from "@google/genai";
import { Place, GooglePlaceResult, Coordinates } from '../types';
import { calculateDistance } from '../utils';

// For Vite, environment variables must be prefixed with VITE_ and accessed via import.meta.env
const getAiClient = () => new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_AI_API_KEY });

export const getVibeCheck = async (place: Place, userBio: string): Promise<string> => {
  const ai = getAiClient();
  const prompt = `
    The user is looking at a place named "${place.name}" which is a ${place.category}.
    User's Bio/Interests: "${userBio}".
    
    Task: Describe this place in 2 short sentences.
    Focus on WHY this specific user would like it based on their bio. 
    Do not be generic. Be decisive and personal.
    Current available data about place: ${place.description}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "This spot is a local favorite.";
  } catch (error) {
    console.error("Gemini Vibe Check Error:", error);
    return `A popular ${place.category} spot in Glasgow.`;
  }
};

export const getExploreRecommendations = async (
  userQuery: string,
  userBio: string,
  knownPlaces: Place[],
  currentContextDescription: string
): Promise<string> => {
  const ai = getAiClient();
  
  const knownPlacesList = knownPlaces.map(p => `- ${p.name} (ID: ${p.id})`).join('\n');

  const systemInstruction = `
    You are Amble, a context-aware travel concierge for a solo female traveler in Glasgow.
    
    User Bio: "${userBio}"
    User's Current Context: ${currentContextDescription}
    
    The user has a curated list of "Known" places saved in the app:
    ${knownPlacesList}
    
    Rules for your response:
    1. Be concise, friendly, and safe.
    2. If you recommend a place that is in the "Known" list above, you MUST explicitly mention that it is already on her list. 
       Format known places like this: **[KNOWN: Place Name]**.
    3. If you recommend a place NOT on the list, treat it as a new discovery. 
       Format new places like this: **[NEW: Place Name]**.
    4. Provide 2-3 recommendations maximum.
    5. Prioritize safety and the user's bio interests (Artisan, hidden gems, etc).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userQuery,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    return response.text || "I couldn't find anything specific, but exploring nearby is always fun!";
  } catch (error) {
    console.error("Gemini Explore Error:", error);
    return "I'm having trouble connecting to the concierge service right now. Please try again.";
  }
};

// Rank search results using Gemini AI
export const rankSearchResults = async (
  query: string,
  userBio: string,
  userLocation: Coordinates,
  results: GooglePlaceResult[]
): Promise<string[]> => {
  // If no results or only one result, no need to rank
  if (results.length <= 1) {
    return results.map(r => r.place_id);
  }

  const ai = getAiClient();
  
  // Build context for each result
  const resultsContext = results.map((place, i) => {
    const distance = calculateDistance(userLocation, place.geometry.location);
    return `${i + 1}. "${place.name}"
   Address: ${place.formatted_address}
   Types: ${place.types.slice(0, 5).join(', ')}
   Rating: ${place.rating || 'N/A'} (${place.user_ratings_total || 0} reviews)
   Distance: ${distance.toFixed(2)} km
   Place ID: ${place.place_id}`;
  }).join('\n\n');

  const prompt = `You are helping a traveler find the best place that matches their search.

User's search query: "${query}"
User's travel preferences: "${userBio}"

Here are the search results from Google Places:

${resultsContext}

Analyze these results and rank them by relevance to the user's search intent and preferences.

Consider:
1. How well the name matches their query (exact or close matches rank higher)
2. User's stated preferences in their bio
3. Proximity to user (prefer closer places for similar relevance)
4. Rating and review count (as a tiebreaker)

Respond with ONLY a JSON array of place_ids in ranked order (most relevant first).
Example format: ["place_id_1", "place_id_2", "place_id_3"]

JSON array:`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.2, // Lower temperature for more consistent ranking
      },
    });
    
    const text = response.text?.trim() || '';
    
    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      console.warn("Gemini ranking: Could not parse JSON, using distance fallback");
      return fallbackRankByDistance(results, userLocation);
    }
    
    const rankedIds: string[] = JSON.parse(jsonMatch[0]);
    
    // Validate that all returned IDs exist in our results
    const validIds = rankedIds.filter(id => 
      results.some(r => r.place_id === id)
    );
    
    // Add any missing IDs at the end (in case Gemini missed some)
    const missingIds = results
      .map(r => r.place_id)
      .filter(id => !validIds.includes(id));
    
    return [...validIds, ...missingIds];
    
  } catch (error) {
    console.error("Gemini Ranking Error:", error);
    // Fallback: sort by distance
    return fallbackRankByDistance(results, userLocation);
  }
};

// Fallback ranking by distance when Gemini fails
function fallbackRankByDistance(
  results: GooglePlaceResult[], 
  userLocation: Coordinates
): string[] {
  return results
    .map(r => ({
      id: r.place_id,
      distance: calculateDistance(userLocation, r.geometry.location)
    }))
    .sort((a, b) => a.distance - b.distance)
    .map(r => r.id);
}
