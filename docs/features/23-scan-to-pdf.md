# 23. Scan to PDF

**Phase:** 4 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Create a PDF directly from a scanner or from photos captured via a webcam/mobile camera.

## 2. Libraries / Tools
- `getUserMedia` (webcam capture in the renderer) for the camera-capture path
- A TWAIN/WIA/SANE bridge is needed for true flatbed-scanner support — document as a known platform-specific complexity (Windows: WIA, Mac: Image Capture APIs via a native helper, Linux: SANE) and scope v1 to the camera-capture path, which works identically cross-platform
- sharp (deskew/crop/enhance captured images)
- pdf-lib (assemble final PDF, same pipeline as JPG to PDF)

## 3. IPC Contract
- Channel: `pdf:scan-to-pdf`
- Input: `{ imageDataUrls: string[], enhance?: boolean }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/scanToPdf.ts`
- Renderer page: `src/renderer/pages/ScanToPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: 'Use Camera' flow — request webcam access via `getUserMedia`, show a live preview with a capture button and an on-screen crop/frame guide.
2. After each capture, show a lightweight review screen: retake / accept / apply auto-enhance (contrast boost + slight sharpening, useful for document photos).
3. Support capturing multiple pages in sequence before finalizing into one PDF (mirrors a real scanner's multi-page workflow).
4. Optionally, for true scanner hardware support, scope a Phase-5 stretch goal: a thin native module or CLI bridge per OS (WIA on Windows, SANE on Linux, ImageCaptureCore via a small Swift/ObjC helper on Mac) — do not attempt this in v1; ship camera-capture first.
5. Send the captured image data URLs to main via `pdf:scan-to-pdf`; main runs each through sharp for auto-enhance (if enabled) then reuses the JPG-to-PDF pdf-lib pipeline to assemble the final document.
6. Return output path.

## 5. UI Requirements (this page specifically)
- Full-screen camera capture view with a clear document-frame guide overlay, per-shot retake/accept review step, and a running thumbnail strip of pages captured so far before finalizing.

## 6. Edge Cases & Error Handling
- No camera available/permission denied → clear message and a fallback to just uploading photos from disk (reuses the JPG to PDF flow directly).
- True scanner (TWAIN/WIA) hardware integration is out of scope for v1 — be explicit about this in the UI ('Use your camera to scan documents') rather than implying full scanner support.

## 7. Acceptance Criteria
- Capturing 3 photos in sequence and finalizing produces a 3-page PDF in capture order.
- Auto-enhance visibly improves contrast/sharpness on a typical document photo without destroying legibility.
- Camera-permission-denied path falls back gracefully to file upload.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
