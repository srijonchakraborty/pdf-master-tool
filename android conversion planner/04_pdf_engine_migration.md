# Phase 4: PDF Engine & Heavy Processing Migration

## Objective
The desktop app relies on the Electron Main Process (`ipcHandlers.ts` and Node.js features) to do heavy lifting. On Android, all Node.js code must either be migrated into the browser (Renderer) or executed via native Java/Kotlin plugins. 

## Tasks
- [ ] **Migrate `pdf-lib` to Frontend**: `pdf-lib` runs perfectly in the browser! Move tools like Merge, Split, Delete Pages, Rotate, and Sign PDF directly into the React components (we've actually already started doing this!).
- [ ] **OCR Engine**: The Node.js `tesseract.js` worker needs to be initialized in the React frontend instead. Since we bundled the offline language data, we can serve `eng.traineddata.gz` as a static asset in the `public` folder for Capacitor to load.
- [ ] **Camera for "Scan to PDF"**: Replace `navigator.mediaDevices.getUserMedia` (which can be flaky in WebViews) with the `@capacitor/camera` native plugin for high-quality document scanning.
- [ ] **Office Converters**: Word/Excel to PDF requires a backend server or a complex Java/Kotlin library. For V1 of the mobile app, these features should either hit a simple cloud API endpoint, or be disabled on mobile if an offline requirement is strictly enforced.
