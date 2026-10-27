# 07. Word to PDF

**Phase:** 3 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Convert Word documents (DOC/DOCX) into PDF, preserving formatting.

## 2. Libraries / Tools
- LibreOffice headless (`soffice --headless --convert-to pdf`)

## 3. IPC Contract
- Channel: `pdf:word-to-pdf`
- Input: `{ filePath: string }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/wordToPdf.ts`
- Renderer page: `src/renderer/pages/WordToPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Reuse the same `binaries.ts` LibreOffice resolver and job queue built for PDF to Word.
2. Main: spawn `soffice --headless --convert-to pdf --outdir <tempDir> <inputFile>`.
3. Return resulting .pdf temp path to renderer.
4. Renderer: same simple single-action pattern as PDF to Word (Dropzone → Convert → Save).

## 5. UI Requirements (this page specifically)
- Reuse the exact same page layout/component as PDF to Word for consistency; only labels/icons differ.

## 6. Edge Cases & Error Handling
- LibreOffice missing → install banner.
- Password-protected .docx → LibreOffice will fail to open it; catch and report 'This document is password-protected' clearly.
- Very complex Word docs (embedded objects, macros) may render slightly differently — acceptable known limitation.

## 7. Acceptance Criteria
- A formatted .docx (headings, images, tables) converts to a PDF that visually matches the original closely.
- Output PDF page count is reasonable relative to the source document length.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
