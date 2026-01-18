import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';

import 'data/places.dart';
import 'services/gemini_service.dart';

// --- MAIN ENTRY POINT ---
void main() {
  runApp(const ProviderScope(child: AmbleApp()));
}

// --- STATE MANAGEMENT ---
final userBioProvider = StateProvider<String>((ref) => defaultBio);
final viewProvider = StateProvider<AppView>((ref) => AppView.Onboarding);
final selectedCategoryProvider = StateProvider<PlaceCategory?>((ref) => null);
final selectedPlaceProvider = StateProvider<Place?>((ref) => null);
final distanceModeProvider = StateProvider<DistanceMode>((ref) => DistanceMode.FromMe);
final userLocationProvider = StateProvider<LatLng?>((ref) => null);
final favoritesProvider = StateProvider<List<String>>((ref) => []);
final mapFiltersProvider = StateProvider<Map<PlaceCategory, bool>>((ref) => {
  PlaceCategory.Food: true,
  PlaceCategory.Coffee: true,
  PlaceCategory.Shopping: true,
  PlaceCategory.Sites: true,
});

enum AppView { Onboarding, Dashboard, List, Detail, Explore, Map }
enum DistanceMode { FromMe, FromHotel }

// --- THE APP ---
class AmbleApp extends StatelessWidget {
  const AmbleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Amble',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.amber, background: const Color(0xFFF8FAFC)),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC), // Slate-50
        fontFamily: 'SanFrancisco', // System default usually
      ),
      home: const MainScaffold(),
    );
  }
}

class MainScaffold extends ConsumerWidget {
  const MainScaffold({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final view = ref.watch(viewProvider);
    
    // Initial Location Check
    _initLocation(ref);

    switch (view) {
      case AppView.Onboarding:
        return const OnboardingView();
      case AppView.Dashboard:
        return const DashboardView();
      case AppView.List:
        return const PlaceListView();
      case AppView.Detail:
        return const PlaceDetailView();
      case AppView.Explore:
        return const ExploreView();
      case AppView.Map:
        return const MapViewFull();
    }
  }

  Future<void> _initLocation(WidgetRef ref) async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
      Position position = await Geolocator.getCurrentPosition();
      ref.read(userLocationProvider.notifier).state = LatLng(position.latitude, position.longitude);
    }
  }
}

// --- VIEWS ---

class OnboardingView extends ConsumerWidget {
  const OnboardingView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bioController = TextEditingController(text: ref.read(userBioProvider));

    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          Image.network(
            'https://images.unsplash.com/photo-1514517220813-a7f8714de65d?q=80&w=1000&auto=format&fit=crop',
            fit: BoxFit.cover,
          ),
          Container(color: Colors.black.withOpacity(0.8)),
          Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("amble.", style: TextStyle(color: Colors.white, fontSize: 42, fontWeight: FontWeight.w300)),
                const Text("Wander intentionally.", style: TextStyle(color: Colors.white70, fontSize: 16)),
                const SizedBox(height: 40),
                const Text("YOUR VIBE", style: TextStyle(color: Colors.amber, fontSize: 12, letterSpacing: 1.5, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text("What makes a place special to you?", style: TextStyle(color: Colors.white54, fontSize: 12)),
                const SizedBox(height: 12),
                TextField(
                  controller: bioController,
                  maxLines: 4,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.1),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: () {
                      ref.read(userBioProvider.notifier).state = bioController.text;
                      ref.read(viewProvider.notifier).state = AppView.Dashboard;
                    },
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.amber, foregroundColor: Colors.black),
                    child: const Text("Start Exploring", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}

class DashboardView extends ConsumerWidget {
  const DashboardView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final distanceMode = ref.watch(distanceModeProvider);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Amble", style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
                      Text("Glasgow Edition", style: TextStyle(color: Colors.grey[600])),
                    ],
                  ),
                  const CircleAvatar(
                    backgroundImage: NetworkImage('https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'),
                  )
                ],
              ),
            ),
            // Toggle
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 24),
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => ref.read(distanceModeProvider.notifier).state = DistanceMode.FromMe,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: distanceMode == DistanceMode.FromMe ? const Color(0xFF0F172A) : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text("FROM ME", textAlign: TextAlign.center, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: distanceMode == DistanceMode.FromMe ? Colors.white : Colors.grey)),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => ref.read(distanceModeProvider.notifier).state = DistanceMode.FromHotel,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: distanceMode == DistanceMode.FromHotel ? const Color(0xFF0F172A) : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text("FROM HOTEL", textAlign: TextAlign.center, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: distanceMode == DistanceMode.FromHotel ? Colors.white : Colors.grey)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Expanded(
              child: GridView.count(
                crossAxisCount: 2,
                padding: const EdgeInsets.symmetric(horizontal: 24),
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: 0.8,
                children: [
                  _buildCard(ref, "Food", Icons.restaurant, Colors.orange.shade400, PlaceCategory.Food),
                  _buildCard(ref, "Coffee", Icons.coffee, Colors.brown.shade700, PlaceCategory.Coffee),
                  _buildCard(ref, "Shopping", Icons.shopping_bag, Colors.pink.shade300, PlaceCategory.Shopping),
                  _buildCard(ref, "Sites", Icons.camera_alt, Colors.teal.shade600, PlaceCategory.Sites),
                ],
              ),
            ),
            const BottomNavBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildCard(WidgetRef ref, String title, IconData icon, Color color, PlaceCategory category) {
    return GestureDetector(
      onTap: () {
        ref.read(selectedCategoryProvider.notifier).state = category;
        ref.read(viewProvider.notifier).state = AppView.List;
      },
      child: Container(
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: Colors.white),
            ),
            Text(title, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}

class PlaceListView extends ConsumerWidget {
  const PlaceListView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final category = ref.watch(selectedCategoryProvider);
    final allPlaces = places.where((p) => p.category == category).toList();
    final anchor = ref.watch(distanceModeProvider) == DistanceMode.FromMe 
        ? (ref.watch(userLocationProvider) ?? hotelCoordinates) 
        : hotelCoordinates;

    // Sorting logic would go here, simplified for brevity
    allPlaces.sort((a, b) {
      final distA = Geolocator.distanceBetween(anchor.latitude, anchor.longitude, a.coordinates.latitude, a.coordinates.longitude);
      final distB = Geolocator.distanceBetween(anchor.latitude, anchor.longitude, b.coordinates.latitude, b.coordinates.longitude);
      return distA.compareTo(distB);
    });

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => ref.read(viewProvider.notifier).state = AppView.Dashboard),
        title: Text(category?.name ?? "List"),
        backgroundColor: Colors.white,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: allPlaces.length,
        itemBuilder: (context, index) {
          final place = allPlaces[index];
          final distMeters = Geolocator.distanceBetween(anchor.latitude, anchor.longitude, place.coordinates.latitude, place.coordinates.longitude);
          final mins = (distMeters / 1000 * 12).ceil();
          
          return GestureDetector(
            onTap: () {
              ref.read(selectedPlaceProvider.notifier).state = place;
              ref.read(viewProvider.notifier).state = AppView.Detail;
            },
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border(left: BorderSide(color: place.priority ? Colors.amber : Colors.transparent, width: 4)),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(place.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      if (place.priority) const Icon(Icons.star, color: Colors.amber, size: 16),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(place.description, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(width: 8, height: 8, decoration: BoxDecoration(color: place.isOpen ? Colors.green : Colors.red, shape: BoxShape.circle)),
                      const SizedBox(width: 6),
                      Text("$mins min walk", style: TextStyle(color: Colors.grey[400], fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  )
                ],
              ),
            ),
          );
        },
      ),
      bottomNavigationBar: const BottomNavBar(),
    );
  }
}

class PlaceDetailView extends ConsumerStatefulWidget {
  const PlaceDetailView({super.key});
  @override
  ConsumerState<PlaceDetailView> createState() => _PlaceDetailViewState();
}

class _PlaceDetailViewState extends ConsumerState<PlaceDetailView> {
  String? vibeCheck;
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadVibe();
  }

  Future<void> _loadVibe() async {
    final place = ref.read(selectedPlaceProvider);
    final bio = ref.read(userBioProvider);
    if (place != null) {
      setState(() => isLoading = true);
      final result = await GeminiService().getVibeCheck(place, bio);
      if (mounted) setState(() { vibeCheck = result; isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final place = ref.watch(selectedPlaceProvider);
    if (place == null) return const SizedBox();

    return Scaffold(
      body: Stack(
        children: [
          // Image Header
          Positioned(
            top: 0, left: 0, right: 0, height: 300,
            child: CachedNetworkImage(
              imageUrl: place.images.first,
              fit: BoxFit.cover,
            ),
          ),
          Positioned(top: 40, left: 16, child: CircleAvatar(backgroundColor: Colors.white, child: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => ref.read(viewProvider.notifier).state = AppView.List))),
          
          // Content
          Positioned.fill(
            top: 280,
            child: Container(
              decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(place.name, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Row(children: [
                    const Icon(Icons.location_on, size: 16, color: Colors.grey),
                    const SizedBox(width: 4),
                    Expanded(child: Text(place.address, style: const TextStyle(color: Colors.grey))),
                  ]),
                  const SizedBox(height: 24),
                  
                  // Vibe Check
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.amber.shade100)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(children: [Icon(Icons.info_outline, color: Colors.amber, size: 20), SizedBox(width: 8), Text("VIBE CHECK", style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, letterSpacing: 1.2))]),
                        const SizedBox(height: 8),
                        isLoading 
                          ? const Text("Consulting the concierge...", style: TextStyle(fontStyle: FontStyle.italic, color: Colors.grey))
                          : Text(vibeCheck ?? "", style: const TextStyle(fontSize: 16, height: 1.5)),
                      ],
                    ),
                  ),
                  const Spacer(),
                  
                  // Buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => launchUrl(Uri.parse("https://www.google.com/maps/dir/?api=1&destination=${place.coordinates.latitude},${place.coordinates.longitude}&travelmode=walking")),
                          icon: const Icon(Icons.navigation),
                          label: const Text("Go Now"),
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F172A), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                   SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => ref.read(viewProvider.notifier).state = AppView.Explore,
                      icon: const Icon(Icons.explore),
                      label: const Text("What else is near here?"),
                      style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                    ),
                  )
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}

class MapViewFull extends ConsumerWidget {
  const MapViewFull({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final placesList = places; // apply filters if needed
    final filters = ref.watch(mapFiltersProvider);
    final userLoc = ref.watch(userLocationProvider) ?? hotelCoordinates;

    return Scaffold(
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(target: userLoc, zoom: 14),
            myLocationEnabled: true,
            markers: placesList.where((p) => filters[p.category] == true).map((p) {
              return Marker(
                markerId: MarkerId(p.id),
                position: p.coordinates,
                icon: BitmapDescriptor.defaultMarkerWithHue(_getHue(p.category)),
                onTap: () {
                   ref.read(selectedPlaceProvider.notifier).state = p;
                   showModalBottomSheet(context: context, builder: (_) => _PlaceBottomSheet(place: p));
                }
              );
            }).toSet()..add(Marker(markerId: const MarkerId('hotel'), position: hotelCoordinates, infoWindow: const InfoWindow(title: 'Home Base'))),
          ),
          
          // Filters
          Positioned(
            top: 50, left: 0, right: 0,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: PlaceCategory.values.map((cat) {
                  final isActive = filters[cat] ?? true;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(cat.name),
                      selected: isActive,
                      onSelected: (val) {
                        final newFilters = Map<PlaceCategory, bool>.from(filters);
                        newFilters[cat] = val;
                        ref.read(mapFiltersProvider.notifier).state = newFilters;
                      },
                      selectedColor: const Color(0xFF0F172A),
                      labelStyle: TextStyle(color: isActive ? Colors.white : Colors.black),
                      checkmarkColor: Colors.white,
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const Positioned(
            bottom: 20, left: 20, right: 20,
            child: BottomNavBar(),
          )
        ],
      ),
    );
  }

  double _getHue(PlaceCategory cat) {
    switch (cat) {
      case PlaceCategory.Food: return BitmapDescriptor.hueOrange;
      case PlaceCategory.Coffee: return BitmapDescriptor.hueRed; // Close enough to Brown
      case PlaceCategory.Shopping: return BitmapDescriptor.hueRose;
      case PlaceCategory.Sites: return BitmapDescriptor.hueViolet;
    }
  }
}

class _PlaceBottomSheet extends ConsumerWidget {
  final Place place;
  const _PlaceBottomSheet({required this.place});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(24),
      height: 250,
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(place.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          Text(place.category.name, style: TextStyle(color: Colors.grey[600])),
          const SizedBox(height: 12),
          Text(place.description),
          const Spacer(),
          Row(children: [
            Expanded(child: OutlinedButton(onPressed: () {
               ref.read(selectedPlaceProvider.notifier).state = place;
               ref.read(viewProvider.notifier).state = AppView.Detail;
            }, child: const Text("Info"))),
            const SizedBox(width: 12),
            Expanded(child: ElevatedButton(onPressed: () {}, child: const Text("Go Now"))),
          ])
        ],
      ),
    );
  }
}

class ExploreView extends ConsumerStatefulWidget {
  const ExploreView({super.key});
  @override
  ConsumerState<ExploreView> createState() => _ExploreViewState();
}

class _ExploreViewState extends ConsumerState<ExploreView> {
  final List<Map<String, String>> messages = []; // {role: 'user'|'model', text: ''}
  final TextEditingController _controller = TextEditingController();
  bool isTyping = false;

  @override
  void initState() {
    super.initState();
    final place = ref.read(selectedPlaceProvider);
    if (place != null) {
      messages.add({'role': 'model', 'text': "You're currently near **${place.name}**. What are you in the mood for next?"});
    } else {
      messages.add({'role': 'model', 'text': "Hi! I'm Amble. I can help you find hidden gems that match your vibe. What are you looking for?"});
    }
  }

  Future<void> _send(String text) async {
    if (text.isEmpty) return;
    setState(() {
      messages.add({'role': 'user', 'text': text});
      isTyping = true;
    });
    _controller.clear();

    final bio = ref.read(userBioProvider);
    final contextDesc = "User is exploring Glasgow."; // Simplified for demo

    final response = await GeminiService().getExploreRecommendations(text, bio, places, contextDesc);
    
    setState(() {
      isTyping = false;
      messages.add({'role': 'model', 'text': response});
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Explore Concierge")),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final msg = messages[index];
                final isUser = msg['role'] == 'user';
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                    decoration: BoxDecoration(
                      color: isUser ? const Color(0xFF0F172A) : Colors.white,
                      borderRadius: BorderRadius.circular(16).copyWith(
                        bottomRight: isUser ? Radius.zero : const Radius.circular(16),
                        bottomLeft: isUser ? const Radius.circular(16) : Radius.zero,
                      ),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)],
                    ),
                    child: Text(msg['text']!, style: TextStyle(color: isUser ? Colors.white : Colors.black87)),
                  ),
                );
              },
            ),
          ),
          if (isTyping) const Padding(padding: EdgeInsets.all(8.0), child: LinearProgressIndicator()),
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Row(children: [
              Expanded(child: TextField(controller: _controller, decoration: InputDecoration(hintText: "Ask Amble...", filled: true, fillColor: Colors.grey[100], border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none)))),
              IconButton(icon: const Icon(Icons.send), onPressed: () => _send(_controller.text)),
            ]),
          ),
          const BottomNavBar(),
        ],
      ),
    );
  }
}

class BottomNavBar extends ConsumerWidget {
  const BottomNavBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final view = ref.watch(viewProvider);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12), // Lift it up slightly
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(30),
        boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, 5))],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min, // Hug content
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _NavItem(icon: Icons.home, label: "Home", isActive: view == AppView.Dashboard, onTap: () => ref.read(viewProvider.notifier).state = AppView.Dashboard),
          const SizedBox(width: 32),
          _NavItem(icon: Icons.map, label: "Map", isActive: view == AppView.Map, onTap: () => ref.read(viewProvider.notifier).state = AppView.Map),
          const SizedBox(width: 32),
          _NavItem(icon: Icons.explore, label: "Explore", isActive: view == AppView.Explore, onTap: () => ref.read(viewProvider.notifier).state = AppView.Explore),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _NavItem({required this.icon, required this.label, required this.isActive, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: isActive ? Colors.amber : Colors.white, size: 24),
          Text(label, style: TextStyle(color: isActive ? Colors.amber : Colors.white, fontSize: 10, fontWeight: FontWeight.bold))
        ],
      ),
    );
  }
}
