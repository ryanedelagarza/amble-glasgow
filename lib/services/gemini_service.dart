import 'package:google_generative_ai/google_generative_ai.dart';
import '../data/places.dart';

// Access API Key passed via --dart-define
const String apiKey = String.fromEnvironment('API_KEY');

class GeminiService {
  late final GenerativeModel _model;

  GeminiService() {
    _model = GenerativeModel(
      model: 'gemini-1.5-flash',
      apiKey: apiKey,
    );
  }

  Future<String> getVibeCheck(Place place, String userBio) async {
    final prompt = '''
      The user is looking at a place named "${place.name}" which is a ${place.category.name}.
      User's Bio/Interests: "$userBio".
      
      Task: Describe this place in 2 short sentences.
      Focus on WHY this specific user would like it based on their bio. 
      Do not be generic. Be decisive and personal.
      Current available data about place: ${place.description}.
    ''';

    try {
      final content = [Content.text(prompt)];
      final response = await _model.generateContent(content);
      return response.text ?? "This spot is a local favorite.";
    } catch (e) {
      print("Gemini Vibe Check Error: $e");
      return "A popular ${place.category.name} spot in Glasgow.";
    }
  }

  Future<String> getExploreRecommendations(
      String userQuery,
      String userBio,
      List<Place> knownPlaces,
      String currentContextDescription
  ) async {
    final knownPlacesList = knownPlaces.map((p) => '- ${p.name} (ID: ${p.id})').join('\n');

    final systemInstruction = '''
      You are Amble, a context-aware travel concierge for a solo female traveler in Glasgow.
      
      User Bio: "$userBio"
      User's Current Context: $currentContextDescription
      
      The user has a curated list of "Known" places saved in the app:
      $knownPlacesList
      
      Rules for your response:
      1. Be concise, friendly, and safe.
      2. If you recommend a place that is in the "Known" list above, you MUST explicitly mention that it is already on her list. 
         Format known places like this: **[KNOWN: Place Name]**.
      3. If you recommend a place NOT on the list, treat it as a new discovery. 
         Format new places like this: **[NEW: Place Name]**.
      4. Provide 2-3 recommendations maximum.
      5. Prioritize safety and the user's bio interests (Artisan, hidden gems, etc).
    ''';

    // Gemini Pro doesn't separate system instructions in the Dart SDK simply yet,
    // so we prepend it to the prompt.
    final fullPrompt = "$systemInstruction\n\nUser Query: $userQuery";

    try {
      final content = [Content.text(fullPrompt)];
      final response = await _model.generateContent(content);
      return response.text ?? "I couldn't find anything specific, but exploring nearby is always fun!";
    } catch (e) {
      print("Gemini Explore Error: $e");
      return "I'm having trouble connecting to the concierge service right now. Please try again.";
    }
  }
}
