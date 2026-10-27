# 10. Edit PDF

**Phase:** 2 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Add or modify text, images, shapes, and simple annotations directly on PDF pages.

## 2. Libraries / Tools
- pdfjs-dist (render pages to canvas as the editing surface)
- pdf-lib (bake the edits — text/image/shape overlays — back into the saved PDF)
- Fabric.js or Konva.js (canvas-based shape/text/image manipulation layer in the renderer)

## 3. IPC Contract
- Channel: `pdf:edit-pdf`
- Input: `{ filePath: string, edits: EditOp[] }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/editPdf.ts`
- Renderer page: `src/renderer/pages/EditPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: render each page via pdfjs-dist onto a canvas; layer a Fabric.js/Konva.js editable canvas on top for the active page.
2. Toolbar: Add Text, Add Image, Draw Rectangle/Line/Highlight, Select/Move, Delete, Undo/Redo.
3. Each edit is recorded as a structured op: `{ type, page, x, y, width, height, text?, fontSize?, color?, imageDataUrl? }`.
4. On 'Save', send the full edits array + original file path to main via `pdf:edit-pdf`.
5. Main: load the PDF with pdf-lib, for each edit op call the matching pdf-lib draw method (`drawText`, `drawImage`, `drawRectangle`, `drawLine`) on the correct page, using PDF coordinate space (remember: PDF origin is bottom-left, canvas is top-left — convert `y = pageHeight - canvasY - elementHeight`).
6. Save and return the new PDF path.
7. Keep this feature scoped to overlay-based editing (adding new content) for v1 — true in-place text reflow editing of existing PDF text is a much larger undertaking and out of scope.

## 5. UI Requirements (this page specifically)
- Toolbar styled like a lightweight design tool (icon buttons, active-tool highlight), floating or docked at top of the canvas.
- Page navigation thumbnails on the side so users can jump between pages while editing.
- Visible Undo/Redo, and a 'Save' button that's disabled until at least one edit is made.

## 6. Edge Cases & Error Handling
- Coordinate conversion between canvas space and PDF space must be tested carefully — this is the most common source of 'my text is in the wrong place' bugs.
- Very large PDFs → only render/keep in memory the current + adjacent pages' canvases, not all pages at once.

## 7. Acceptance Criteria
- Adding a text box at a chosen position appears in the exact corresponding position in the saved PDF.
- Adding an image and a rectangle both persist correctly after save and reload.
- Undo/redo correctly reverts/reapplies the last operation.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
