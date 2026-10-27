# Phase 3: Native File System Integration

## Objective
Electron's Node.js `fs` module does not work on Android. We must replace all `window.api.readFile` and `window.api.saveFile` calls with Capacitor's Native Filesystem Plugin.

## Tasks
- [ ] **Install Filesystem Plugin**: Run `npm install @capacitor/filesystem`.
- [ ] **Bridge the API**: Create a generic `MobileAPI` interface that matches the existing `window.api` structure so the React components don't need to change much.
- [ ] **Read Files**: Implement PDF reading using `Filesystem.readFile()` which returns base64 data instead of a Node Buffer. Convert base64 to `Uint8Array` for `pdf-lib`.
- [ ] **Save Files**: Implement PDF saving using `Filesystem.writeFile()`. Use the `Directory.Documents` or `Directory.ExternalStorage` enum to save files where Android users can find them.
- [ ] **File Picker**: Install `@capacitor/file-picker` or use the standard HTML `<input type="file" accept=".pdf">` which perfectly bridges to the native Android file selector.
