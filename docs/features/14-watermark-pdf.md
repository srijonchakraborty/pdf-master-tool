# 14. Watermark PDF

**Phase:** 2 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Apply a custom text or image watermark across pages of a PDF.

## 2. Libraries / Tools
- pdf-lib (`drawText`/`drawImage` with rotation + transparency across every selected page)

## 3. IPC Contract
- Channel: `pdf:watermark-pdf`
- Input: `{ filePath: string, type: 'text'|'image', text?: string, imagePath?: string, opacity: number, rotation: number, fontSize?: number, pages: 'all'|number[] }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/watermarkPdf.ts`
- Renderer page: `src/renderer/pages/WatermarkPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: form with Text/Image toggle, text input or image upload, opacity slider, rotation slider, font size (for text), and a live preview rendered on the first page's thumbnail (approximate, using CSS transforms over the pdfjs-rendered canvas) so the user sees roughly what they'll get before committing.
2. Page selector: 'All pages' or a specific range (reuse the range-parsing util from Split PDF).
3. Send config to main via `pdf:watermark-pdf`.
4. Main: for each selected page, use pdf-lib to draw the text (centered, rotated, semi-transparent via `opacity` in `drawText`/`drawImage` options) or embed and draw the image similarly.
5. Save and return output path.

## 5. UI Requirements (this page specifically)
- Live approximate preview on a single page thumbnail before applying to the whole document.
- Opacity and rotation as sliders with numeric readouts.

## 6. Edge Cases & Error Handling
- Watermark text too long for page width at large font size → auto-shrink font or wrap, don't let it overflow silently.
- Selected 'specific pages' range includes out-of-bounds page numbers → validate like in Split PDF.

## 7. Acceptance Criteria
- Applying a text watermark to all pages of a sample PDF shows it correctly rotated/positioned/transparent on every page.
- Image watermark mode embeds and positions the image correctly.
- Page-range selection only watermarks the chosen pages, leaving others untouched.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
