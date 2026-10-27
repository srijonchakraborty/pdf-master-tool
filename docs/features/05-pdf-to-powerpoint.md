# 05. PDF to PowerPoint

**Phase:** 4 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Convert PDF pages into a PPT/PPTX presentation. True editable-text conversion quality from generic PDFs is poor with free tools — v1 approach renders each PDF page as a high-res image and places one per slide (image-based, still editable in the sense of a normal PPTX slide/object), documented as a known limitation.

## 2. Libraries / Tools
- pdfjs-dist (render each page to a high-res canvas/PNG)
- pptxgenjs (build the .pptx, one image per slide)

## 3. IPC Contract
- Channel: `pdf:pdf-to-powerpoint`
- Input: `{ filePath: string, dpi?: number }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/pdfToPowerpoint.ts`
- Renderer page: `src/renderer/pages/PdfToPowerpointPage.tsx`

## 4. Step-by-Step Implementation

1. Main: use pdfjs-dist in a headless/node context (or render in a hidden BrowserWindow) to rasterize each page at a high DPI (e.g. 200) to PNG buffers.
2. For each page image, add a pptxgenjs slide sized to match the PDF page aspect ratio, and place the image full-bleed.
3. Save the .pptx to a temp path, return to renderer.
4. Clearly label this tool in the UI as producing image-based slides, with a note that text won't be selectable — set expectations honestly.
5. (Stretch/Phase-5 improvement, not required for v1): attempt text-layer extraction per page via pdfjs text content API and overlay as an invisible/selectable text box on top of the image, improving searchability without full layout fidelity.

## 5. UI Requirements (this page specifically)
- Show a small info banner: 'Pages will be converted as high-quality images inside your slides.'
- DPI/quality selector (Standard/High) since higher DPI = bigger pptx file.

## 6. Edge Cases & Error Handling
- Very high page count PDFs → warn about resulting file size and processing time.
- Non-standard page sizes/orientations → set each slide's dimensions per page rather than forcing one fixed size.

## 7. Acceptance Criteria
- A 5-page PDF produces a 5-slide PPTX, each slide showing the correct page image at readable quality.
- Output opens correctly in PowerPoint and LibreOffice Impress.
- Slide aspect ratio matches source page aspect ratio (no stretching/distortion).

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
