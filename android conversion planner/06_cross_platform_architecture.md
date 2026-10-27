# Phase 6: Cross-Platform Abstraction (Windows & Android Side-by-Side)

## Objective
To ensure that a single codebase can compile to both the Windows Electron app and the Android Capacitor app simultaneously, we must create a **Cross-Platform Bridge**. This guarantees that updating code once will automatically reflect across both platforms without breaking either.

## The Problem
Currently, the React frontend relies heavily on `window.api` to communicate with the Electron backend (Node.js). Android (Capacitor) does not have `window.api` or Node.js.

## The Solution: The API Bridge
We will implement an abstraction layer (e.g., `src/renderer/src/api/index.ts`) that automatically detects the environment and routes the function calls accordingly.

### Tasks
- [ ] **Environment Detection**: Create a utility to detect if the app is running inside Electron (`!!window.electron`) or Capacitor (`Capacitor.isNativePlatform()`).
- [ ] **API Wrapper**: Replace direct calls to `window.api.readFile` across the entire codebase with a new wrapper: `CoreAPI.readFile()`.
- [ ] **Electron Implementation**: Inside `CoreAPI`, if the environment is Electron, simply pass the request to `window.api` (which triggers `ipcMain`).
- [ ] **Android Implementation**: If the environment is Capacitor, map the request to `@capacitor/filesystem` or process the PDF directly in the browser using `pdf-lib`.
- [ ] **Unified Build Scripts**: Update `package.json` with scripts like `npm run dev:win` and `npm run dev:android` so you can test both side-by-side simultaneously from the same repository.
