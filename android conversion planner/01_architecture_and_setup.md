# Phase 1: Architecture & Setup

## Objective
Migrate the existing React codebase from Electron to Android using Capacitor. Capacitor allows us to wrap the existing React web UI into a native Android app with minimal changes to the frontend code.

## Tasks
- [ ] **Initialize Capacitor**: Run `npm install @capacitor/core @capacitor/cli` and initialize the Capacitor project (`npx cap init`).
- [ ] **Add Android Platform**: Run `npm install @capacitor/android` and `npx cap add android`.
- [ ] **Configure Build Path**: Update `capacitor.config.ts` to point `webDir` to the Vite build output folder (usually `dist` or `out/renderer`).
- [ ] **Remove Electron Dependencies**: Create a mobile-specific branch. Strip out `electron`, `electron-builder`, and `@electron-toolkit` from the mobile build dependencies.
- [ ] **Setup Android Studio**: Ensure Android Studio and the Android SDK are installed to compile the Capacitor project.
- [ ] **First Build Test**: Run `npm run build` and `npx cap sync android`, then open in Android Studio to verify the app launches in the emulator.
