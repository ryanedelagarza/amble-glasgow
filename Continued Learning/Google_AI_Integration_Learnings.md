# Google AI Integration & Multi-Platform Deployment - Learnings

**Project:** Amble (Glasgow Edition)  
**Date:** January 18, 2026  
**Context:** Debugging Google AI (Gemini) integration across Web (Vercel) and iOS (Codemagic) deployments

---

## Executive Summary

This document captures key learnings from integrating Google's Gemini AI service into a multi-platform application (Web + iOS). The primary challenges involved environment variable configuration, model naming conventions, and platform-specific deployment requirements.

---

## Table of Contents

1. [Environment Variables Across Platforms](#environment-variables-across-platforms)
2. [Vite-Specific Configuration](#vite-specific-configuration)
3. [Flutter/Dart Compile-Time Variables](#flutterdart-compile-time-variables)
4. [Google AI Model Naming](#google-ai-model-naming)
5. [Google AI Studio vs Standard Deployment](#google-ai-studio-vs-standard-deployment)
6. [Google Maps iOS Configuration](#google-maps-ios-configuration)
7. [Debugging API Errors](#debugging-api-errors)
8. [Quick Reference](#quick-reference)

---

## Environment Variables Across Platforms

### The Challenge

Different platforms handle environment variables differently. A variable that works in local development may not work in production, and the syntax varies between:
- Vite (Web)
- Flutter/Dart (Mobile)
- CI/CD platforms (Vercel, Codemagic)

### Key Insight

> Environment variables must be configured at THREE levels: the code that reads them, the build system that injects them, and the deployment platform that stores them.

### Platform-Specific Patterns

| Platform | Code Access | Build Configuration | Secret Storage |
|----------|-------------|---------------------|----------------|
| **Vite (Web)** | `import.meta.env.VITE_*` | Automatic for `VITE_` prefix | Vercel Environment Variables |
| **Flutter (iOS)** | `String.fromEnvironment('KEY')` | `--dart-define=KEY=$VALUE` | Codemagic Secrets |
| **Node.js** | `process.env.KEY` | Varies by bundler | Platform-specific |

---

## Vite-Specific Configuration

### The Problem

```typescript
// This does NOT work in Vite for client-side code
const apiKey = process.env.API_KEY;
```

### The Solution

Vite requires the `VITE_` prefix for any environment variable exposed to client-side code:

```typescript
// Correct for Vite
const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
```

### Why This Matters

Vite intentionally restricts which environment variables are exposed to the browser for security. Only variables prefixed with `VITE_` are included in the client bundle. This prevents accidentally exposing server-side secrets.

### Configuration Cleanup

If migrating from another system (like Google AI Studio), remove any custom `define` blocks in `vite.config.ts`:

```typescript
// Before (Google AI Studio style)
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
    };
});

// After (Standard Vite)
export default defineConfig({
  // No define block needed - Vite handles VITE_* vars automatically
});
```

---

## Flutter/Dart Compile-Time Variables

### The Problem

Dart's `String.fromEnvironment()` reads values at **compile time**, not runtime. If you don't pass the value during build, it will be an empty string forever in that binary.

```dart
// This reads at COMPILE TIME, not runtime
const String apiKey = String.fromEnvironment('API_KEY');
```

### The Solution

Pass the value via `--dart-define` during the build:

```yaml
# In codemagic.yaml
- name: Build archive
  script: |
    flutter build ios --release --no-codesign --dart-define=API_KEY=$GOOGLE_AI_API_KEY
```

### Key Insight

> Unlike web apps where environment variables can be injected at runtime, Flutter apps bake these values into the compiled binary. Missing the `--dart-define` flag means the app ships with empty strings.

---

## Google AI Model Naming

### The Problem

Google's AI models have specific naming conventions that change over time:

```
models/gemini-1.5-flash is not found for API version v1beta
```

### Model Evolution

| Era | Model Names | Status |
|-----|-------------|--------|
| Legacy | `gemini-pro` | Deprecated |
| Previous | `gemini-1.5-flash`, `gemini-1.5-pro` | May not work with all APIs |
| Current | `gemini-2.0-flash-exp` | Experimental |
| Latest | `gemini-3-flash-preview`, `gemini-3-pro-preview` | Current recommended |

### The Solution

Always check the [official documentation](https://ai.google.dev/gemini-api/docs/models) for current model names. As of January 2026:

```typescript
// Recommended for most use cases
model: 'gemini-3-flash-preview'
```

### Key Insight

> Model names in AI services change frequently. When you get a "model not found" error, the first thing to check is whether the model name is still valid.

---

## Google AI Studio vs Standard Deployment

### The Problem

Code that works in Google AI Studio's "Deploy" feature may not work when deployed to standard hosting (Vercel, Netlify, etc.).

### Why This Happens

Google AI Studio deployments use:
1. **Import maps** to load dependencies from CDN (esm.sh)
2. **Special runtime environment** that may have access to preview models
3. **Pre-configured API access** tied to your Google account

Standard deployments require:
1. **Bundled dependencies** (via Vite, Webpack, etc.)
2. **Explicit API keys** configured in environment variables
3. **Standard model access** through the Generative Language API

### The Fix

When migrating from AI Studio to standard hosting:

1. **Remove import maps** from `index.html`:
```html
<!-- Remove this block -->
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@^19.2.3",
    "@google/genai": "https://esm.sh/@google/genai@^1.37.0"
  }
}
</script>
```

2. **Add Vite entry point**:
```html
<!-- Add this before </body> -->
<script type="module" src="/index.tsx"></script>
```

3. **Configure environment variables** in your hosting platform

### Key Insight

> Google AI Studio's "Deploy" creates a self-contained deployment that bypasses normal bundling. When moving to standard CI/CD, you must reconfigure for traditional build pipelines.

---

## Google Maps iOS Configuration

### The Problem

The iOS app crashes when opening the map view, but the web version works fine.

### Root Cause

- **Web version**: Uses Leaflet with CARTO/OpenStreetMap tiles (no API key needed)
- **iOS version**: Uses `google_maps_flutter` which requires Google Maps SDK initialization

### The Solution

When iOS project files are generated dynamically in CI, you must inject the Google Maps configuration:

```yaml
# In codemagic.yaml, after flutter create
cat > ios/Runner/AppDelegate.swift << APPDELEGATE
import UIKit
import Flutter
import GoogleMaps

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GMSServices.provideAPIKey("$GOOGLE_MAPS_API_KEY")
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
APPDELEGATE
```

### Required Google Cloud APIs

| API | Purpose | Platform |
|-----|---------|----------|
| **Generative Language API** | Gemini AI | Web + iOS |
| **Maps SDK for iOS** | Google Maps on iOS | iOS only |
| **Maps SDK for Android** | Google Maps on Android | Android only |

### Key Insight

> Different map libraries have different requirements. Leaflet (web) is free and needs no key. Google Maps (mobile) requires SDK initialization with an API key in native code.

---

## Debugging API Errors

### The Process

When AI features fail silently (showing fallback messages), use browser developer tools:

1. **Open DevTools** (F12)
2. **Go to Console tab**
3. **Trigger the failing action**
4. **Read the actual error message**

### Example Debug Session

```
Gemini Explore Error: ApiError: {
  "error": {
    "code": 404,
    "message": "models/gemini-1.5-flash is not found for API version v1beta",
    "status": "NOT_FOUND"
  }
}
```

This error immediately tells us:
- The API is reachable (not a key issue)
- The model name is the problem (404 = not found)

### Common Error Patterns

| Error Code | Meaning | Likely Cause |
|------------|---------|--------------|
| 401 | Unauthorized | Invalid or missing API key |
| 403 | Forbidden | API not enabled for project |
| 404 | Not Found | Invalid model name |
| 429 | Rate Limited | Too many requests |
| 500 | Server Error | Google's issue, retry later |

### Key Insight

> Never debug API issues without looking at the actual error. The catch block's generic message hides valuable diagnostic information.

---

## Quick Reference

### Environment Variable Checklist

**For Vercel (Web):**
```
Variable: VITE_GOOGLE_AI_API_KEY
Code:     import.meta.env.VITE_GOOGLE_AI_API_KEY
```

**For Codemagic (iOS):**
```
Secrets:  GOOGLE_AI_API_KEY, GOOGLE_MAPS_API_KEY
Build:    --dart-define=API_KEY=$GOOGLE_AI_API_KEY
Code:     String.fromEnvironment('API_KEY')
```

### Model Names (January 2026)

```
Recommended: gemini-3-flash-preview
Alternative: gemini-3-pro-preview (more capable, higher cost)
```

### Required Google Cloud APIs

1. **Generative Language API** - For Gemini AI
2. **Maps SDK for iOS** - For Google Maps on iOS (not Maps 3D SDK)

### Debugging Commands

```javascript
// Add to your catch block temporarily for debugging
console.error("Full error:", JSON.stringify(error, null, 2));
```

---

## Lessons Learned Summary

1. **Environment variables are platform-specific** - What works locally may not work in production without explicit configuration.

2. **Vite requires VITE_ prefix** - This is a security feature, not a bug.

3. **Flutter compile-time variables need --dart-define** - Missing this flag = empty strings in production.

4. **Model names change** - Always verify against current documentation when getting "not found" errors.

5. **Google AI Studio is not standard hosting** - Code that works in AI Studio may need significant changes for Vercel/Netlify.

6. **Different platforms, different map libraries** - Web (Leaflet) and mobile (Google Maps) have completely different requirements.

7. **Always check the actual error** - Generic error messages hide valuable diagnostic information.

---

## Document Metadata

**Version:** 1.0  
**Created:** January 18, 2026  
**Context:** Amble Glasgow - Multi-platform AI integration  
**Related:** iOS_Deployment_Learnings.md

---

**End of Document**
