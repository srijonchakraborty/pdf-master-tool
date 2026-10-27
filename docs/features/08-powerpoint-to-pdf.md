# 08. PowerPoint to PDF

**Phase:** 3 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Convert PPT/PPTX presentations into PDF documents, one slide per page.

## 2. Libraries / Tools
- LibreOffice headless (`soffice --headless --convert-to pdf`)

## 3. IPC Contract
- Channel: `pdf:powerpoint-to-pdf`
- Input: `{ filePath: string }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/powerpointToPdf.ts`
- Renderer page: `src/renderer/pages/PowerpointToPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Reuse the LibreOffice resolver/queue.
2. Main: spawn `soffice --headless --convert-to pdf --outdir <tempDir> <inputFile>` (same command works for pptx as for docx).
3. Return output path to renderer.

## 5. UI Requirements (this page specifically)
- Same simple single-action pattern as Word to PDF.

## 6. Edge Cases & Error Handling
- LibreOffice missing → install banner.
- Slides with embedded video/audio → only a static frame will appear in the PDF, this is expected and should be mentioned in UI copy.

## 7. Acceptance Criteria
- A multi-slide PPTX converts to a PDF with one page per slide, in the correct order, readable and correctly oriented.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
