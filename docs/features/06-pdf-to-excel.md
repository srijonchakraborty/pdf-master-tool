# 06. PDF to Excel

**Phase:** 4 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Detect and extract tabular data from a PDF into an editable Excel spreadsheet.

## 2. Libraries / Tools
- Python `camelot-py` (or `pdfplumber` as a lighter alternative) invoked via child_process for table detection — this is the one feature where a small bundled Python step is the pragmatic choice; document as an optional dependency, detected like Ghostscript/LibreOffice
- exceljs (build the resulting .xlsx from extracted table data)

## 3. IPC Contract
- Channel: `pdf:pdf-to-excel`
- Input: `{ filePath: string, pages?: string }`
- Output: `{ outputPath: string, tablesFound: number }`
- Main-process module: `src/main/features/pdfToExcel.ts`
- Renderer page: `src/renderer/pages/PdfToExcelPage.tsx`

## 4. Step-by-Step Implementation

1. Add Python + camelot/pdfplumber detection to `binaries.ts` (check for `python3`/`python` on PATH and the packages importable; if missing, show install banner with `pip install camelot-py[cv] pdfplumber`).
2. Ship a small bundled script `scripts/extract_tables.py` that takes a PDF path (+ optional page range) and prints table data as JSON to stdout.
3. Main: spawn the Python script, parse its JSON output (list of tables, each a 2D array of cell strings).
4. Use exceljs to write each detected table to its own worksheet (name sheets 'Table 1', 'Table 2', ...), auto-sizing columns.
5. Return output path and a `tablesFound` count so the UI can say 'Found 3 tables.'
6. Renderer: page-range input (optional, default = all pages), progress modal, and a results summary showing how many tables were found before offering the save dialog.

## 5. UI Requirements (this page specifically)
- Clear messaging that this feature works best on PDFs with visible table gridlines/structure, not free-flowing text.
- Show a 'no tables found' friendly empty state rather than a generic error if extraction returns zero tables.

## 6. Edge Cases & Error Handling
- Python/camelot missing → install-instructions banner listing exact pip command.
- Zero tables detected → friendly empty state, not an error toast.
- Malformed/irregular tables may extract imperfectly — this is a known limitation of any table-extraction approach; message accordingly rather than promising perfection.

## 7. Acceptance Criteria
- Running against a PDF with a clear table produces an .xlsx with correctly separated columns/rows for the majority of cells.
- A PDF with no tables returns a graceful 'no tables found' result, not a crash.
- Multiple tables land on separate, clearly named worksheets.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
