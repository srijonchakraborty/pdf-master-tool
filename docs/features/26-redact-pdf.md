# 26. Redact PDF

**Phase:** 4 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Permanently remove sensitive text or images from a PDF (not just visually cover them — actually strip the underlying content).

## 2. Libraries / Tools
- pdfjs-dist (render pages + get text-layer positions so the user can select regions/text to redact)
- pdf-lib for the actual redaction: draw an opaque black box over the region AND remove/replace the underlying content stream text in that area — true redaction requires touching content streams, not just drawing over them, or the original text remains extractable by copy-paste; implement by rewriting the affected content stream operators for the selected region, or as a pragmatic first version, rasterize the affected page(s) to an image and rebuild that page as an image-only page so no extractable text remains underneath the box

## 3. IPC Contract
- Channel: `pdf:redact-pdf`
- Input: `{ filePath: string, redactions: { page: number, x: number, y: number, width: number, height: number }[] }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/redactPdf.ts`
- Renderer page: `src/renderer/pages/RedactPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: page-preview canvas (reuse Edit PDF's rendering approach) where the user draws rectangles over regions to redact; show them as solid black boxes immediately for clear visual feedback.
2. On save, send the list of redaction rectangles (page + coordinates) to main via `pdf:redact-pdf`.
3. Main v1 approach (safe and simple): for each page containing at least one redaction, rasterize that full page to a high-DPI image via pdfjs-dist, draw solid black rectangles over the redacted regions on that image (using sharp or node-canvas), then replace that page in the output PDF with an image-only page built via pdf-lib — this guarantees no underlying selectable/extractable text remains, at the cost of that page no longer having selectable text itself.
4. Clearly disclose this trade-off in the UI: 'Redacted pages will no longer have selectable text, to guarantee sensitive content cannot be recovered.'
5. (Stretch goal, Phase 5): implement true content-stream-level redaction that only removes the covered glyphs/objects while leaving the rest of the page's text selectable — significantly more complex, do not attempt until the simple/safe rasterization approach is solid and tested.
6. Return output path.

## 5. UI Requirements (this page specifically)
- Draw-a-box-to-redact interaction directly on the page preview, redacted areas shown as solid black immediately, and an explicit warning/confirmation before finalizing: 'This cannot be undone once saved. Redacted regions will be permanently removed.'

## 6. Edge Cases & Error Handling
- This is a security-sensitive feature — test explicitly that redacted text is NOT recoverable via copy-paste or by opening the output file's raw content streams in a text editor, before considering this feature done.
- Redaction boxes must align pixel-perfectly with the rendered preview the user drew on — any coordinate-mapping bug here is a real data-leak risk, treat it with the same care as the Edit PDF coordinate mapping.

## 7. Acceptance Criteria
- After redacting a region containing text, that text cannot be recovered by selecting/copying from the output PDF, nor found by searching the file's raw bytes for the original string.
- The redacted area is visibly a solid black box with no 'ghost' text bleeding around its edges.
- Non-redacted pages/regions are completely unaffected.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
