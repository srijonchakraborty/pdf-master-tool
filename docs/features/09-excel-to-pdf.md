# 09. Excel to PDF

**Phase:** 3 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Convert Excel spreadsheets into PDF documents.

## 2. Libraries / Tools
- LibreOffice headless (`soffice --headless --convert-to pdf`)

## 3. IPC Contract
- Channel: `pdf:excel-to-pdf`
- Input: `{ filePath: string }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/excelToPdf.ts`
- Renderer page: `src/renderer/pages/ExcelToPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Reuse the LibreOffice resolver/queue.
2. Main: spawn the same convert-to-pdf command; note Excel sheets with very wide content may span multiple PDF pages per sheet by default — this is LibreOffice's default print-area behavior.
3. (Optional improvement) Before conversion, offer a 'fit to one page wide' checkbox that sets the print scaling via a LibreOffice macro parameter or by pre-processing the sheet's print area with exceljs — only build this if time allows; document as a stretch goal otherwise.
4. Return output path to renderer.

## 5. UI Requirements (this page specifically)
- Same simple single-action pattern as other Office→PDF tools, plus the optional 'fit to page width' checkbox mentioned above.

## 6. Edge Cases & Error Handling
- LibreOffice missing → install banner.
- Very large/wide spreadsheets → many output pages is expected default behavior; message this rather than treating as a bug.

## 7. Acceptance Criteria
- A multi-sheet workbook converts to a PDF containing all sheets in order.
- Numbers/formulas display as their calculated values, not formula text.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
