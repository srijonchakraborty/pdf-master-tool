# 24. OCR PDF

**Phase:** 4 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Convert scanned/image-only PDFs into searchable PDFs with a selectable text layer, using OCR.

## 2. Libraries / Tools
- pdfjs-dist (render each page to an image for OCR input)
- tesseract.js (OCR engine, pure JS/WASM, downloads language data on first use)
- pdf-lib (re-embed the original page image plus an invisible text layer at the recognized word positions — the standard 'searchable PDF' technique)

## 3. IPC Contract
- Channel: `pdf:ocr-pdf`
- Input: `{ filePath: string, language: string }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/ocrPdf.ts`
- Renderer page: `src/renderer/pages/OcrPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: language selector (start with English + a handful of common languages; tesseract.js supports 100+ but bundle/download only what's selected to avoid huge installs).
2. Main: render each page to an image via pdfjs-dist, run it through tesseract.js which returns recognized words with bounding boxes and confidence scores.
3. Build the output PDF: draw the original page image as the visible layer, then for each recognized word draw an invisible (render-mode 3 / non-stroking, effectively transparent) text run at the matching bounding box position, so the visible page looks unchanged but text is selectable/searchable underneath.
4. Show live progress ('OCR: page 3 of 12…') since Tesseract processing is not instant, especially on multi-page documents.
5. Return the output path; also return an overall confidence summary so the user knows if quality was poor (e.g. noisy scan) even though the tool still produced output.

## 5. UI Requirements (this page specifically)
- Language dropdown, clear per-page progress during OCR (this can take real time, don't just show an indeterminate spinner), and a post-completion confidence/quality summary.

## 6. Edge Cases & Error Handling
- Very low-quality/skewed scans → OCR accuracy will be poor; surface the confidence score rather than implying perfect results.
- First use of a given language needs to download tesseract's language data — handle this with a visible download-progress step, not a silent long hang.
- Large multi-page PDFs → process page-by-page with progress, not all at once, to keep the UI responsive and allow cancellation.

## 7. Acceptance Criteria
- Running OCR on a scanned English-text PDF produces a PDF where the text is selectable and matches the visible content reasonably well.
- The visible appearance of the page is unchanged (the OCR text layer is invisible, only the underlying image is shown).
- Progress updates are shown per page during a multi-page OCR run.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
