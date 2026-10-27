# 04. PDF to Word

**Phase:** 3 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Convert a PDF into an editable DOC/DOCX file, preserving layout as closely as possible.

## 2. Libraries / Tools
- LibreOffice headless (`soffice --headless --convert-to docx`) as primary engine
- Document known limitation: complex layouts/columns/tables may not convert perfectly — this is a LibreOffice engine limitation, not something to try to fully solve in v1

## 3. IPC Contract
- Channel: `pdf:pdf-to-word`
- Input: `{ filePath: string }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/pdfToWord.ts`
- Renderer page: `src/renderer/pages/PdfToWordPage.tsx`

## 4. Step-by-Step Implementation

1. Extend `binaries.ts` to locate `soffice`/`soffice.exe` per OS (Program Files on Win, /Applications on Mac, PATH on Linux).
2. Main: spawn `soffice --headless --convert-to docx --outdir <tempDir> <inputFile>` with a generous timeout (LibreOffice startup is slow, ~5-15s cold start).
3. LibreOffice can only run one instance at a time per user profile — queue conversion jobs if multiple are requested concurrently (simple in-process queue in main).
4. Return the resulting .docx temp path to renderer.
5. Renderer: simple single-file flow (drop PDF → click Convert → save dialog), no page-level UI needed.

## 5. UI Requirements (this page specifically)
- Straightforward single-action tool page — Dropzone, a 'Convert to Word' button, progress modal with a message like 'Converting… this can take a moment.'

## 6. Edge Cases & Error Handling
- LibreOffice not installed → install-instructions banner (same pattern as Compress).
- Concurrent conversion requests → queued, not run in parallel, to avoid LibreOffice profile lock errors.
- Scanned/image-only PDFs will convert to a Word doc with an embedded image, not editable text — mention this in UI copy ('Tip: run OCR PDF first for scanned documents').

## 7. Acceptance Criteria
- A text-based PDF converts to a .docx that opens in Word/LibreOffice Writer with readable, mostly-correctly-formatted text.
- Two conversions requested back-to-back both complete successfully (queueing works).
- Missing-LibreOffice path shows the install banner.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
