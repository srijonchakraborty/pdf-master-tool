# 12. JPG to PDF

**Phase:** 2 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Convert one or more JPG (or PNG) images into a single PDF document.

## 2. Libraries / Tools
- pdf-lib (`embedJpg`/`embedPng`, create a page per image sized to match image aspect ratio)

## 3. IPC Contract
- Channel: `pdf:jpg-to-pdf`
- Input: `{ filePaths: string[], pageSize: 'fit'|'a4'|'letter', order: string[] }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/jpgToPdf.ts`
- Renderer page: `src/renderer/pages/JpgToPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: Dropzone accepts multiple images; show a reorderable thumbnail grid (same drag-to-reorder pattern as Merge PDF's file list).
2. Page-size option: 'Fit to image' (page = image's own aspect ratio) vs fixed 'A4'/'Letter' (image centered/scaled to fit within margins).
3. Send ordered file paths + page-size choice to main via `pdf:jpg-to-pdf`.
4. Main: create a new PDFDocument; for each image, embed via `embedJpg`/`embedPng`, add a page sized per the chosen option, draw the image scaled/centered appropriately.
5. Save and return the output path.

## 5. UI Requirements (this page specifically)
- Drag-to-reorder thumbnail grid identical in spirit to the Merge PDF file list.
- Live preview count: 'This will create a N-page PDF.'

## 6. Edge Cases & Error Handling
- Mixed image formats (JPG + PNG together) → both should be supported via pdf-lib's respective embed methods, detected by file extension/mime.
- Very large source images → consider downscaling to a sane max dimension to avoid producing an unnecessarily huge PDF (configurable in the UI as an 'optimize for smaller file size' toggle).

## 7. Acceptance Criteria
- 3 images in a chosen order produce a 3-page PDF with pages in that exact order.
- Fit-to-image mode preserves each image's original aspect ratio without distortion.
- A4/Letter mode centers images with visible margins and no cropping/stretching.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
