# Phase 5: Testing and Deployment

## Objective
Finalize the Android application, test native functionalities, and prepare it for the Google Play Store.

## Tasks
- [ ] **Hardware Acceleration**: Enable hardware acceleration in the `AndroidManifest.xml` for smooth PDF rendering with `pdfjsLib`.
- [ ] **Permissions**: Add necessary permissions to `AndroidManifest.xml` (e.g., `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `CAMERA`).
- [ ] **App Icon & Splash Screen**: Use `@capacitor/assets` to automatically generate all required Android icon sizes and splash screens from a single high-res logo.
- [ ] **Performance Profiling**: Run the app on a physical Android device to test memory limits when processing large PDFs (100+ pages). Implement web worker threading if the UI blocks.
- [ ] **Build APK/AAB**: Generate the signed Android App Bundle (AAB) via Android Studio for Play Store submission.
