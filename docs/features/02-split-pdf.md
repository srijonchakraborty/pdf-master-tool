# 02. Split PDF

**Phase:** 2 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Extract one or more pages (or page ranges) from a PDF into separate PDF files.

## 2. Libraries / Tools
- pdf-lib (copyPages by index into new documents)
- pdfjs-dist (render thumbnails for page picker)

## 3. IPC Contract
- Channel: `pdf:split-pdf`
- Input: `{ filePath: string, mode: 'ranges'|'everyPage'|'selection', ranges?: string, selectedPages?: number[] }`
- Output: `{ outputPaths: string[] }`
- Main-process module: `src/main/features/splitPdf.ts`
- Renderer page: `src/renderer/pages/SplitPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: load the PDF, render a PageThumbnailGrid using pdfjs-dist so the user can visually select pages or ranges.
2. Offer 3 modes: (a) 'Extract by range' text input like `1-3, 5, 8-10`, (b) 'Split every page into its own file', (c) 'Select pages' via thumbnail checkboxes.
3. Send file path + mode + range/selection data to main via `pdf:split-pdf`.
4. Main: parse range string into concrete page indices (write a small shared `parsePageRanges()` util, reused by Organize/Delete features too).
5. For each resulting group of pages, create a new PDFDocument via copyPages and save to a temp file; name outputs like `original-name_pages-1-3.pdf`.
6. If multiple output files are produced, zip them together (use `archiver` npm package) and return a single zip path for easy saving; also offer 'save all to folder' as an alternative.
7. Return list of output paths (or the zip path) to renderer for the save dialog.

## 5. UI Requirements (this page specifically)
- Page thumbnails support click-to-toggle selection with a visible checkmark overlay.
- Range input has live validation (red outline + message if range is invalid or out of bounds).
- Show a preview count: 'This will create 3 files' before confirming.

## 6. Edge Cases & Error Handling
- Invalid range syntax → inline validation error, block submit.
- Range refers to a page number beyond the document length → clamp or reject with clear message.
- Selecting zero pages → disable the action button.

## 7. Acceptance Criteria
- Range `1-3,5` on a 10-page doc produces a 4-page PDF with exactly pages 1,2,3,5 in order.
- 'Split every page' on a 5-page doc produces 5 single-page PDFs, zipped.
- Thumbnail multi-select produces a PDF containing exactly the selected pages in the order selected.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
