# 15. Rotate PDF

**Phase:** 2 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Rotate individual pages or the whole document to the desired orientation.

## 2. Libraries / Tools
- pdf-lib (`page.setRotation(degrees)`)

## 3. IPC Contract
- Channel: `pdf:rotate-pdf`
- Input: `{ filePath: string, rotations: { page: number, degrees: 90|180|270|0 }[] }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/rotatePdf.ts`
- Renderer page: `src/renderer/pages/RotatePdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: PageThumbnailGrid (same shared component as Split/Organize) where each thumbnail has rotate-left/rotate-right icon buttons that visually spin the thumbnail immediately (optimistic UI) and record the intended rotation per page.
2. Support 'select multiple pages, rotate all selected at once' via the grid's multi-select mode.
3. Send the list of `{page, degrees}` changes to main via `pdf:rotate-pdf`.
4. Main: load with pdf-lib, for each affected page call `setRotation(degrees(rotationValue))`, save.
5. Return output path.

## 5. UI Requirements (this page specifically)
- Reuse PageThumbnailGrid with rotate-left/right icon overlays per thumbnail on hover, and a toolbar 'rotate selected 90°' action for multi-select.

## 6. Edge Cases & Error Handling
- Rotation degrees must be normalized to one of 0/90/180/270 (PDF spec only supports these) — reject/clamp anything else.
- Rotating an already-rotated page should compose correctly (e.g. rotate 90° twice = 180°), not overwrite in a confusing way.

## 7. Acceptance Criteria
- Rotating a single page by 90° shows that page correctly rotated on reopen, others unaffected.
- Multi-select rotate-all applies the same rotation to every selected page.
- Rotating a page twice by 90° results in a 180° rotation, not back to 0°.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
