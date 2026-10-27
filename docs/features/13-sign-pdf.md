# 13. Sign PDF

**Phase:** 4 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Add an electronic signature to a PDF — either a visual signature (drawn/typed/uploaded image, stamped on the page) or a real cryptographic digital signature.

## 2. Libraries / Tools
- pdf-lib (place the visual signature image/text at a chosen position)
- node-signpdf + node-forge (for actual PKCS#7 digital signing with a certificate, used only in 'Digital Signature' mode)

## 3. IPC Contract
- Channel: `pdf:sign-pdf`
- Input: `{ filePath: string, mode: 'visual'|'digital', signatureImageDataUrl?: string, page: number, x: number, y: number, certPath?: string, certPassword?: string }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/signPdf.ts`
- Renderer page: `src/renderer/pages/SignPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: signature capture UI with 3 input methods — draw (canvas freehand), type (choose from a few script fonts), or upload an image — matching common e-signature UX.
2. Let the user drag-place the signature onto the target page (reuse the PDF page-preview canvas from Edit PDF).
3. For 'Visual signature' mode: send the signature as a PNG data URL + placement coords to main; main embeds it via pdf-lib exactly like an image edit.
4. For 'Digital Signature' mode (more advanced, can be Phase-4-stretch): let the user select/import a `.pfx`/`.p12` certificate file + password; main prepares the PDF byte range for signing and uses node-signpdf + node-forge to produce a real PKCS#7 signature embedded per the PDF spec.
5. Return the signed PDF path; for digital-signature mode, clearly show a 'Signed & certified' badge to distinguish it from a plain visual stamp.
6. 'Request signature from others' (multi-party signing/email workflow) is out of scope for the local desktop v1 — note this clearly as a future/cloud-feature; v1 focuses on self-signing a local file.

## 5. UI Requirements (this page specifically)
- Signature pad with Draw/Type/Upload tabs, a clear 'Place on document' drag step, and a confirmation preview before saving.
- Visually distinguish 'Signed (visual only)' vs 'Digitally signed & certified' outcomes in the success state.

## 6. Edge Cases & Error Handling
- No certificate available for digital mode → clearly explain the difference from visual signing and don't block the simpler visual flow.
- Wrong certificate password → clear inline error, not a generic failure.
- Multi-party 'request signature' flows requiring email/cloud infra are explicitly out of scope for v1 — do not attempt to fake this.

## 7. Acceptance Criteria
- Visual signature appears at the exact chosen position/page after save.
- Digital-signature mode (if implemented) produces a PDF that shows as validly signed when opened in Adobe Acrobat Reader.
- Typed/drawn/uploaded signature input methods all successfully produce a placeable image.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
