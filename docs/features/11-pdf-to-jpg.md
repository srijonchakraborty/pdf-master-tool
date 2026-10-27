# 11. PDF to JPG

**Phase:** 2 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Convert PDF pages into JPG images, or extract embedded images from the PDF.

## 2. Libraries / Tools
- pdfjs-dist (render each page to canvas → export as JPG)
- pdf-lib or a low-level PDF object scan (extract embedded raw images without re-rendering, for the 'extract embedded images' mode)

## 3. IPC Contract
- Channel: `pdf:pdf-to-jpg`
- Input: `{ filePath: string, mode: 'renderPages'|'extractEmbedded', quality?: number, dpi?: number }`
- Output: `{ outputPaths: string[] }`
- Main-process module: `src/main/features/pdfToJpg.ts`
- Renderer page: `src/renderer/pages/PdfToJpgPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: toggle between two modes — 'Convert each page to an image' (most common) and 'Extract images embedded in this PDF' (pulls out photos/graphics as-is).
2. For render-pages mode: main renders each page via pdfjs-dist at the chosen DPI (default 150, 'High quality' option = 300) to a canvas, exports as JPG buffer via `canvas.toBuffer('image/jpeg', {quality})`.
3. For extract-embedded mode: parse the PDF's XObject image streams directly (pdf-lib's low-level API or a small custom parser) and save each as its own JPG/PNG without re-rendering the page.
4. Zip all resulting images together (using `archiver`) if there's more than one, return the zip path (or single file path if only one page/image).
5. Renderer: show a thumbnail grid of the resulting images before the save dialog, with a 'download all as zip' vs the OS save dialog choice.

## 5. UI Requirements (this page specifically)
- DPI/quality selector with a visible expected-size hint.
- Result grid with thumbnails and per-image download options plus a 'download all' zip button.

## 6. Edge Cases & Error Handling
- PDF has no embedded images (in extract mode) → friendly empty state, not an error.
- Very high page count at high DPI → warn about total output size and processing time before starting.

## 7. Acceptance Criteria
- Rendering a 5-page PDF at default DPI produces 5 correctly-oriented JPGs, zipped.
- Extract-embedded mode on a PDF with 2 photos returns exactly those 2 images, not the full rendered pages.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
