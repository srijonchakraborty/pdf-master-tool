# 16. HTML to PDF

**Phase:** 2 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Convert a web page URL or raw HTML content into a PDF document.

## 2. Libraries / Tools
- Electron's built-in `webContents.printToPDF()` on a hidden BrowserWindow — no external dependency needed since Electron already bundles Chromium

## 3. IPC Contract
- Channel: `pdf:html-to-pdf`
- Input: `{ source: { type: 'url', url: string } | { type: 'html', html: string }, options?: { landscape?: boolean, marginsType?: number, pageSize?: string } }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/htmlToPdf.ts`
- Renderer page: `src/renderer/pages/HtmlToPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: toggle between 'Enter a URL' and 'Paste/write HTML' input modes, plus basic print options (orientation, page size, margins).
2. Send the source + options to main via `pdf:html-to-pdf`.
3. Main: create a hidden, offscreen `BrowserWindow`, load the URL via `loadURL` or the HTML via `loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))`, wait for `did-finish-load`.
4. Call `win.webContents.printToPDF(options)`, write the returned buffer to a temp file, close the hidden window.
5. Return output path to renderer.

## 5. UI Requirements (this page specifically)
- Simple two-mode input toggle (URL vs raw HTML paste), print-options panel (orientation/page size/margins), progress modal while the hidden window loads and renders.

## 6. Edge Cases & Error Handling
- URL fails to load (network error, 404) → clear error message, don't hang indefinitely (set a load timeout).
- Pages with heavy JS/animations → wait a short additional delay after `did-finish-load` or expose an optional 'extra wait time' setting for slow-loading pages.
- Untrusted/arbitrary HTML input → the hidden BrowserWindow should have `nodeIntegration: false` and a locked-down webPreferences, same as the main app, to avoid any script in the HTML reaching Node APIs.

## 7. Acceptance Criteria
- Converting a known simple public URL produces a readable, correctly laid-out PDF.
- Pasting raw HTML produces a matching PDF preview.
- Landscape/page-size options visibly change the output.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
