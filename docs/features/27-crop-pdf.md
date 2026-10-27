# 27. Crop PDF

**Phase:** 2 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Trim page margins or crop to a selected area on some or all pages.

## 2. Libraries / Tools
- pdf-lib (`page.setCropBox(x, y, width, height)`)

## 3. IPC Contract
- Channel: `pdf:crop-pdf`
- Input: `{ filePath: string, cropBox: { x: number, y: number, width: number, height: number }, pages: 'all'|number[] }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/cropPdf.ts`
- Renderer page: `src/renderer/pages/CropPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: show the first page at full size with a draggable/resizable crop-rectangle overlay (standard crop-tool UX, like an image cropper), plus quick-preset buttons ('Trim margins slightly', 'Trim margins a lot') that auto-suggest a crop box.
2. Page scope selector: apply to all pages or a specific range.
3. Convert the chosen crop rectangle from canvas/display coordinates to PDF point coordinates (remember the y-flip, same as Edit PDF).
4. Send to main via `pdf:crop-pdf`; main calls `setCropBox` on each targeted page with the computed box.
5. Return output path.

## 5. UI Requirements (this page specifically)
- Standard image-cropper-style interaction: draggable corner/edge handles on a rectangle overlaying the page preview, with a live numeric readout of the crop dimensions.

## 6. Edge Cases & Error Handling
- Different pages in the same document may have different original page sizes — if applying to 'all pages', either apply the same absolute crop box (simplest, works when page sizes match) or a proportional crop (scales the box relative to each page's own dimensions) — pick proportional as the more robust default and document the choice here.
- Cropping to a zero or negative-size box → validate and block.

## 7. Acceptance Criteria
- Cropping the first page to a chosen rectangle shows only that region when reopened, in a standard PDF viewer.
- Applying to 'all pages' correctly proportionally scales the crop across pages of differing dimensions.
- A degenerate (zero-area) crop selection is blocked with a clear message rather than producing a broken page.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
