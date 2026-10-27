# 19. Organize PDF

**Phase:** 2 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Reorder, insert, delete, or rearrange pages within a single PDF document.

## 2. Libraries / Tools
- pdf-lib (`copyPages` in the new order into a fresh document)
- pdfjs-dist (thumbnails for the reorder grid)

## 3. IPC Contract
- Channel: `pdf:organize-pdf`
- Input: `{ filePath: string, pageOrder: number[] }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/organizePdf.ts`
- Renderer page: `src/renderer/pages/OrganizePdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: reuse PageThumbnailGrid in full drag-to-reorder + multi-select-delete mode — this is effectively the shared component originally built for Split/Rotate, now used for its core reordering purpose.
2. Toolbar: delete selected pages, duplicate a page, drag to reorder (Framer Motion `layout` animation for smooth reflow), 'insert pages from another PDF' (opens a second file picker and splices its pages in at a chosen position).
3. On save, compute the final page-index order (accounting for deletions/insertions/reordering) and send to main via `pdf:organize-pdf`.
4. Main: build a new PDFDocument, `copyPages` from the (possibly multiple) source documents in the exact final order.
5. Return output path.

## 5. UI Requirements (this page specifically)
- This is the primary showcase for the PageThumbnailGrid component — drag reordering must feel smooth (Framer Motion layout animations), multi-select with a visible selection count, and a clear 'unsaved changes' indicator.

## 6. Edge Cases & Error Handling
- Inserting pages from a second PDF requires tracking which source document each page in the working set came from — maintain an internal `{sourceFileIndex, pageIndex}` mapping, not just final page numbers.
- Deleting all pages → block save with a clear message (a PDF needs at least 1 page).

## 7. Acceptance Criteria
- Reordering pages via drag-and-drop and saving produces a PDF with pages in the new order.
- Deleting 2 pages from a 10-page PDF produces an 8-page PDF missing exactly those pages.
- Inserting pages from a second PDF at a chosen position correctly splices them in.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
