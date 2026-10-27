# 21. Repair PDF

**Phase:** 3 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Attempt to recover content and repair a corrupted or damaged PDF file.

## 2. Libraries / Tools
- qpdf (`qpdf --qdf --replace-input` or a straightforward re-save, which often fixes structural issues)
- Ghostscript as a fallback (`gs -o output.pdf -sDEVICE=pdfwrite input.pdf` frequently rebuilds a valid PDF from a damaged one even qpdf can't parse cleanly)

## 3. IPC Contract
- Channel: `pdf:repair-pdf`
- Input: `{ filePath: string }`
- Output: `{ outputPath: string, method: 'qpdf'|'ghostscript', success: boolean }`
- Main-process module: `src/main/features/repairPdf.ts`
- Renderer page: `src/renderer/pages/RepairPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: simple single-action tool (Dropzone → 'Attempt Repair' button → progress modal → result).
2. Main: first try `qpdf --check` to diagnose, then attempt `qpdf` normalization/rewrite; if that fails or qpdf can't open the file at all, fall back to Ghostscript's rebuild pass.
3. Try opening the resulting file with pdf-lib as a final sanity check (`PDFDocument.load`) before declaring success.
4. Return which method succeeded and the output path; if both methods fail, return a clear 'this file could not be repaired' result rather than a silent/generic error.

## 5. UI Requirements (this page specifically)
- Clear 3-state result UI: Repaired successfully / Repaired with some data loss (if warnings were present) / Could not be repaired — set expectations honestly, this is a best-effort recovery tool.

## 6. Edge Cases & Error Handling
- Both qpdf and Ghostscript fail → clear 'unrecoverable' message rather than returning a broken file silently.
- Very large corrupted files → apply a reasonable timeout to avoid hanging indefinitely.

## 7. Acceptance Criteria
- A PDF with a broken xref table (a common real-world corruption) is successfully repaired and opens normally afterward.
- A genuinely unrecoverable file (e.g. truncated to a few random bytes) is reported as such, not falsely marked successful.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
