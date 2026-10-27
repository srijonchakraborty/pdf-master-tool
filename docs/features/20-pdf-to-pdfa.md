# 20. PDF to PDF/A

**Phase:** 3 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Convert a PDF to the PDF/A archival standard for long-term preservation (embeds fonts, removes non-conforming elements).

## 2. Libraries / Tools
- Ghostscript (`gs -dPDFA=2 -dPDFACompatibilityPolicy=1 -sColorConversionStrategy=UseDeviceIndependentColor -sDEVICE=pdfwrite ...`)

## 3. IPC Contract
- Channel: `pdf:pdf-to-pdf-a`
- Input: `{ filePath: string, conformanceLevel: '1b'|'2b'|'3b' }`
- Output: `{ outputPath: string, warnings?: string[] }`
- Main-process module: `src/main/features/pdfToPdfA.ts`
- Renderer page: `src/renderer/pages/PdfToPdfAPage.tsx`

## 4. Step-by-Step Implementation

1. Reuse the Ghostscript resolver from Compress PDF.
2. Renderer: simple conformance-level selector (default 2b, the most commonly required level) with a short plain-language explainer of what PDF/A is for (archiving/compliance).
3. Main: spawn Ghostscript with the PDF/A conversion flags matching the chosen level, capture stderr for any conformance warnings Ghostscript reports (e.g. fonts it couldn't embed).
4. Surface any warnings to the renderer even on success, so the user knows if full conformance wasn't guaranteed.
5. Return output path.

## 5. UI Requirements (this page specifically)
- Short educational blurb explaining PDF/A's purpose, a conformance-level dropdown, and a warnings panel shown if Ghostscript reported any issues.

## 6. Edge Cases & Error Handling
- Ghostscript missing → install banner.
- Some PDFs (with non-embeddable fonts, transparency, or JavaScript) cannot be made fully conformant — surface Ghostscript's warnings rather than silently claiming success.

## 7. Acceptance Criteria
- A standard text PDF converts to a PDF/A file that validates against a PDF/A validator (e.g. veraPDF, for manual testing).
- Conversion warnings, if any, are shown to the user rather than swallowed.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
