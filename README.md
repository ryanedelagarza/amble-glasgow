<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Amble — Glasgow Edition

**A context-aware travel concierge app that solves decision paralysis through intentional wandering.**

[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?logo=flutter&logoColor=white)](https://flutter.dev/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

[Web Demo](https://ai.studio/apps/drive/1g_ldp1pnmAvXgyI9oMKO7zJWXxQIXLA2) • [Report Bug](#contributing) • [Request Feature](#contributing)

</div>

---

## 📖 Table of Contents

- [About The Project](#-about-the-project)
- [Philosophy & Intent](#-philosophy--intent)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [File Structure & Responsibilities](#-file-structure--responsibilities)
- [Getting Started](#-getting-started)
  - [Web App (React)](#web-app-react)
  - [Mobile App (Flutter)](#mobile-app-flutter)
- [Environment Variables](#-environment-variables)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Data Model](#-data-model)
- [AI Integration](#-ai-integration)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 About The Project

**Amble** is a curated travel companion designed specifically for solo travelers exploring Glasgow, Scotland. Unlike generic travel apps that overwhelm users with endless options, Amble takes a "less is more" approach—providing a handpicked selection of local favorites across four categories: Food, Coffee, Shopping, and Sites.

The app leverages **Google Gemini AI** to provide personalized "Vibe Checks"—contextual descriptions of why a specific place matches the user's stated interests and travel style.

### The Problem We Solve

When traveling, especially solo, "decision paralysis" is real. You have limited time, hundreds of options, and no local knowledge. Generic apps serve tourist traps and sponsored listings. Amble curates ~30 genuinely great spots, sorted by walking distance, with AI-powered personalization.

---

## 💭 Philosophy & Intent

Amble is built on three core principles:

1. **Intentional Wandering** — Travel shouldn't be optimized; it should be discovered. Amble helps you *find* things, not *plan* an itinerary.

2. **Context Over Quantity** — A handful of excellent recommendations beats a thousand mediocre ones. Every place in Amble is hand-curated.

3. **Personal Resonance** — The AI doesn't just describe places; it explains why *you specifically* would enjoy them based on your stated preferences.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Onboarding Vibe** | Users describe their travel style (e.g., "I love artisan shops and hidden gems over tourist traps") |
| **Category Browsing** | Four curated categories: Food, Coffee, Shopping, Sites |
| **Distance Sorting** | Toggle between "From Me" (GPS) and "From Hotel" (fixed anchor point) |
| **AI Vibe Check** | Gemini-powered personalized descriptions for each place |
| **Explore Concierge** | Chat interface for conversational recommendations |
| **Interactive Map** | Filterable map view with custom markers |
| **Image Gallery** | Multiple images per location with fullscreen viewer |
| **Favorites** | Save places to a personal list |
| **Direct Navigation** | One-tap walking directions via Google Maps |

---

## 🛠 Tech Stack

Amble is a **dual-implementation project** with both web and mobile versions sharing the same data and AI logic:

### Web Application
| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Vite 6** | Build tool & dev server |
| **Tailwind CSS** | Styling (via CDN) |
| **Leaflet.js** | Interactive maps |
| **Lucide React** | Icon library |
| **@google/genai** | Gemini AI SDK |

### Mobile Application
| Technology | Purpose |
|------------|---------|
| **Flutter 3** | Cross-platform framework |
| **Dart** | Programming language |
| **Riverpod** | State management |
| **Google Maps Flutter** | Native maps |
| **Geolocator** | Location services |
| **google_generative_ai** | Gemini AI SDK |
| **Codemagic** | CI/CD for iOS builds |

---

## 🏗 Project Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AMBLE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   WEB APP    │    │  MOBILE APP  │    │   GOOGLE GEMINI  │  │
│  │   (React)    │    │   (Flutter)  │    │       AI         │  │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘  │
│         │                   │                     │             │
│         └─────────┬─────────┘                     │             │
│                   │                               │             │
│         ┌─────────▼─────────┐                     │             │
│         │   SHARED DATA     │◄────────────────────┘             │
│         │   (Places DB)     │                                   │
│         └───────────────────┘                                   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      SERVICES                             │  │
│  │  • Vibe Check: Personalized place descriptions            │  │
│  │  • Explore Chat: Conversational recommendations           │  │
│  │  • Distance Calc: Haversine formula for walking times     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure & Responsibilities

### Root Directory

```
amble-glasgow/
├── 📄 README.md              # Project documentation (this file)
├── 📄 package.json           # NPM dependencies and scripts (web)
├── 📄 pubspec.yaml           # Dart dependencies (mobile)
├── 📄 vite.config.ts         # Vite bundler configuration
├── 📄 tsconfig.json          # TypeScript compiler options
├── 📄 codemagic.yaml         # CI/CD pipeline for iOS builds
├── 📄 metadata.json          # App metadata for AI Studio
├── 📄 index.html             # HTML entry point with CDN imports
├── 📄 index.tsx              # React entry point
├── 📄 App.tsx                # Main React application component
├── 📄 types.ts               # TypeScript type definitions
├── 📄 constants.ts           # Static data (places, coordinates)
├── 📄 utils.ts               # Utility functions (distance calculations)
├── services/
│   └── 📄 geminiService.ts   # Gemini AI integration (web)
├── lib/                      # Flutter source code
│   ├── 📄 main.dart          # Flutter app entry point & all views
│   ├── data/
│   │   └── 📄 places.dart    # Place data model and list (mobile)
│   └── services/
│       └── 📄 gemini_service.dart  # Gemini AI integration (mobile)
├── android/                  # Android platform files
│   └── app/src/main/
│       └── 📄 AndroidManifest.xml  # Android permissions & config
└── ios/                      # iOS platform files
    └── Runner/
        └── 📄 Info.plist     # iOS permissions & config
```

### Detailed File Descriptions

#### Core Web Files

| File | Purpose |
|------|---------|
| `index.html` | Entry HTML with Tailwind CSS (CDN), Leaflet.js maps library, and ES module import maps for browser-native module resolution |
| `index.tsx` | React DOM mounting point; wraps `<App />` in StrictMode |
| `App.tsx` | **Main application logic** — Contains all React components, state management, view rendering, and the interactive map. This is the heart of the web app (~850 lines) |
| `types.ts` | TypeScript interfaces for `Place`, `Coordinates`, `ChatMessage`, `UserPreferences`, and enums for `Category` and `DistanceMode` |
| `constants.ts` | Static data including all curated places (30+), hotel anchor coordinates, and default user bio. Uses Unsplash for place imagery |
| `utils.ts` | Haversine formula implementation for calculating distances between coordinates; walking time estimation (12 min/km) |
| `vite.config.ts` | Vite configuration with React plugin, environment variable injection for API keys, and path aliasing |
| `tsconfig.json` | TypeScript config targeting ES2022 with JSX support and bundler module resolution |

#### AI Service Layer

| File | Purpose |
|------|---------|
| `services/geminiService.ts` | **Web AI integration** — Exports `getVibeCheck()` for place-specific personalization and `getExploreRecommendations()` for chat-based discovery. Uses `gemini-3-flash-preview` model |
| `lib/services/gemini_service.dart` | **Mobile AI integration** — Dart equivalent using `google_generative_ai` package with `gemini-pro` model |

#### Flutter Mobile Files

| File | Purpose |
|------|---------|
| `lib/main.dart` | **Complete Flutter app** — Contains Riverpod state providers, all view widgets (Onboarding, Dashboard, List, Detail, Explore, Map), and bottom navigation. Single-file architecture for simplicity |
| `lib/data/places.dart` | `Place` class definition, `PlaceCategory` enum, `hotelCoordinates` constant, and the full places list mirroring `constants.ts` |
| `lib/services/gemini_service.dart` | `GeminiService` class with identical AI prompt logic to the web version |

#### Platform Configuration

| File | Purpose |
|------|---------|
| `android/AndroidManifest.xml` | Declares `INTERNET`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` permissions; Google Maps API key placeholder |
| `ios/Runner/Info.plist` | iOS privacy strings for location access, export compliance (`ITSAppUsesNonExemptEncryption: false`), and display settings |
| `codemagic.yaml` | Automated iOS release workflow: code signing, archive creation, IPA export, and TestFlight submission |

#### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | NPM config with `dev`, `build`, `preview` scripts; dependencies include React 19, Vite 6, Lucide icons |
| `pubspec.yaml` | Flutter config with dependencies for Riverpod, Google Maps, Geolocator, Gemini AI, and URL launcher |
| `metadata.json` | App metadata for Google AI Studio; declares geolocation permission requirement |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (for web)
- **Flutter SDK** 3.2+ (for mobile)
- **Google Gemini API Key** ([Get one here](https://ai.google.dev/))

### Web App (React)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/amble-glasgow.git
cd amble-glasgow

# 2. Install dependencies
npm install

# 3. Create environment file
echo "GEMINI_API_KEY=your_api_key_here" > .env.local

# 4. Start development server
npm run dev

# 5. Open http://localhost:3000
```

### Mobile App (Flutter)

```bash
# 1. Install Flutter dependencies
flutter pub get

# 2. Run on device/emulator with API key
flutter run --dart-define=API_KEY=your_api_key_here

# For release builds:
flutter build ios --dart-define=API_KEY=your_api_key_here
flutter build apk --dart-define=API_KEY=your_api_key_here
```

> ⚠️ **Google Maps API Key**: For the Flutter app's map functionality, add your Google Maps API key to `android/app/src/main/AndroidManifest.xml` (line 34).

---

## 🔐 Environment Variables

| Variable | Platform | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Web (.env.local) | Google Gemini AI API key |
| `API_KEY` | Flutter (--dart-define) | Google Gemini AI API key |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Codemagic | iOS App Store Connect API private key |
| `APP_STORE_CONNECT_KEY_ID` | Codemagic | App Store Connect key identifier |
| `APP_STORE_CONNECT_ISSUER_ID` | Codemagic | App Store Connect issuer ID |

---

## 🔄 CI/CD Pipeline

The project uses **Codemagic** for automated iOS builds and TestFlight distribution.

### Workflow: `ios-release`

```yaml
Trigger: Manual or push to main
Environment: Mac Mini M1, Xcode latest, Flutter stable

Steps:
1. Set up iOS platform & auto-increment build number
2. Configure code signing with distribution certificate
3. Build Flutter iOS archive (--no-codesign)
4. Create signed archive via xcodebuild
5. Export IPA with ExportOptions.plist
6. Upload to TestFlight via App Store Connect API
```

### Required Codemagic Variables

Set these in Codemagic's environment variable groups:

| Group | Variables |
|-------|-----------|
| `app_store_connect` | `APP_STORE_CONNECT_PRIVATE_KEY`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID` |

---

## 📊 Data Model

### Place Schema

```typescript
interface Place {
  id: string;              // Unique identifier (e.g., 'f1', 'c3', 's5', 'v2')
  name: string;            // Display name
  category: Category;      // 'Food' | 'Coffee' | 'Shopping' | 'Sites'
  description: string;     // Brief tagline
  address: string;         // Human-readable address
  coordinates: {           // GPS coordinates
    lat: number;
    lng: number;
  };
  priority: boolean;       // "Curator's Pick" badge
  isOpen?: boolean;        // Operational status (mocked)
  images: string[];        // Array of image URLs (Unsplash)
}
```

### Category IDs

| Category | ID Prefix | Example |
|----------|-----------|---------|
| Food | `f` | `f1` = Paesano Pizza |
| Coffee | `c` | `c1` = Laboratorio Espresso |
| Shopping | `s` | `s1` = Knock Nook |
| Sites | `v` | `v1` = The Hidden Lane |

### Anchor Points

| Name | Coordinates | Purpose |
|------|-------------|---------|
| Hotel (Native Glasgow) | `55.8606, -4.2520` | Fixed distance reference when "From Hotel" is selected |
| User Location | Dynamic (GPS) | Real-time location for "From Me" distances |

---

## 🤖 AI Integration

Amble uses **Google Gemini** for two key features:

### 1. Vibe Check (Place Details)

Triggered when viewing a place's detail screen. Generates a personalized 2-sentence description.

**Prompt Template:**
```
The user is looking at a place named "{place.name}" which is a {place.category}.
User's Bio/Interests: "{userBio}".

Task: Describe this place in 2 short sentences.
Focus on WHY this specific user would like it based on their bio.
Do not be generic. Be decisive and personal.
```

### 2. Explore Concierge (Chat)

Conversational interface for discovering places. The AI is aware of all curated places and formats recommendations accordingly.

**System Instruction:**
```
You are Amble, a context-aware travel concierge for a solo female traveler in Glasgow.

Rules:
1. Be concise, friendly, and safe.
2. Known places → **[KNOWN: Place Name]**
3. New discoveries → **[NEW: Place Name]**
4. Maximum 2-3 recommendations
5. Prioritize safety and user's stated interests
```

### Models Used

| Platform | Model |
|----------|-------|
| Web | `gemini-3-flash-preview` |
| Flutter | `gemini-pro` |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Contribution Ideas

- 🗺️ Add more Glasgow locations to the curated list
- 🌍 Create city variants (Edinburgh, London, etc.)
- 🎨 Design improvements and animations
- 🧪 Add unit and integration tests
- 📱 Implement Android-specific optimizations
- 🔒 Add user authentication for cloud sync

### Code Style

- **Web**: Follow existing React patterns; prefer functional components and hooks
- **Flutter**: Follow Riverpod conventions; keep providers in `main.dart`
- **Commits**: Use conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)

---

## 📄 License

This project is for demonstration and educational purposes. All curated place data represents real Glasgow establishments and is provided for reference.

---

<div align="center">

**Made with ☕ for Glasgow explorers**

[⬆ Back to Top](#amble--glasgow-edition)

</div>
