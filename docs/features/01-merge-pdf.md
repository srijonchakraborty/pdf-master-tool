# 01. Merge PDF

**Phase:** 2 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Combine multiple PDF files into a single document, preserving the page order the user chooses.

## 2. Libraries / Tools
- pdf-lib (load each source PDF, copyPages, append to a new PdfDocument)

## 3. IPC Contract
- Channel: `pdf:merge-pdf`
- Input: `{ filePaths: string[] }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/mergePdf.ts`
- Renderer page: `src/renderer/pages/MergePdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: Dropzone accepts multiple PDF files; show them as a reorderable list (drag handles) with filename + page count per file, fetched via a quick pdf-lib `getPageCount()` call.
2. Add 'Add more files' button and a delete-file (x) icon per row.
3. On 'Merge' click, send ordered `filePaths[]` to main via `pdf:merge-pdf`.
4. Main: for each path in order, load with `PDFDocument.load(fs.readFileSync(path))`, `copyPages` all indices, `addPage` each into a fresh `PDFDocument`.
5. Write merged bytes to a temp output path, return it to renderer.
6. Renderer: show success toast with 'Save As' / 'Open folder' actions; use Electron `dialog.showSaveDialog` to let user pick final destination, then move temp file there.
7. Handle encrypted/corrupted source files by catching pdf-lib load errors per file and reporting which file failed without crashing the whole merge.

## 5. UI Requirements (this page specifically)
- File list is drag-to-reorder (use PageThumbnailGrid pattern but at file level, not page level).
- Show total combined page count live as files are added/reordered.
- Primary button reads 'Merge N files' and is disabled until 2+ files loaded.

## 6. Edge Cases & Error Handling
- Fewer than 2 files selected → disable merge button, show hint text.
- A source file is password-protected → show inline error on that file's row, let user remove it or unlock it first (link to Unlock PDF tool).
- Very large combined file (1000+ pages) → show progress modal, process should not block the UI thread (do heavy work in main process, it's already off the renderer thread).

## 7. Acceptance Criteria
- Merging 3 sample PDFs produces one PDF with all pages in the exact chosen order.
- Page count of output equals sum of inputs.
- Reordering files before merge changes output order correctly.
- A corrupted file in the list is reported clearly and does not crash the app.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
