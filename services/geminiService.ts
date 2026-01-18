import { GoogleGenAI } from "@google/genai";
import { Place } from '../types';

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
      model: 'gemini-1.5-flash',
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
      model: 'gemini-1.5-flash',
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
