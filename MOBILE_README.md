# Mobile App Conversion

This project has been converted to support Android APK generation using Capacitor.

## Prerequisites for Building (if you want to build manually)
- Java (JDK 21 or similar)
- Android Studio & Android SDK

## Initial Setup Performed
- Installed `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`.
- Initialized Capacitor project `com.inventory.billing`.
- Configured Next.js for static export (`output: 'export'`).
- Added Android platform (`npx cap add android`).

## How to Build APK
1. **Configure API URL**:
   The mobile app cannot verify `localhost`. You MUST verify your PC's IP address (e.g., `192.168.1.5`) and update `lib/api.ts`:
   ```typescript
   // lib/api.ts
   const API_BASE_URL = "http://192.168.1.5:5001/api" // Replace with your IP
   ```
2. **Rebuild Frontend**:
   ```bash
   npm run build
   npx cap sync
   ```
3. **Build APK**:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   The APK will be located at: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Running the App
1. **Start the Backend Server**:
   The mobile app requires the backend server to be running on your PC.
   ```bash
   # Run the server (ensure it listens on 0.0.0.0 or is accessible via network)
   node server/app.js
   ```
   *Note: You might need to adjust the server to listen on all interfaces.*

2. **Install APK**:
   Transfer `app-debug.apk` to your phone and install it.
   Ensure your phone is on the same Wi-Fi as your PC.
