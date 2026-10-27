# 03. Compress PDF

**Phase:** 3 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Reduce PDF file size (primarily by downsampling/recompressing embedded images) while keeping acceptable visual quality.

## 2. Libraries / Tools
- Ghostscript (`gs -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook ...`) as the primary compression engine
- Fallback for when Ghostscript isn't installed: pdf-lib + sharp to manually re-encode embedded images at lower quality/resolution

## 3. IPC Contract
- Channel: `pdf:compress-pdf`
- Input: `{ filePath: string, quality: 'low'|'medium'|'high' }`
- Output: `{ outputPath: string, originalSize: number, newSize: number }`
- Main-process module: `src/main/features/compressPdf.ts`
- Renderer page: `src/renderer/pages/CompressPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Build `binaries.ts` resolver: locate `gs`/`gswin64c` on PATH per OS; if missing, return a flag so the UI can show an install-instructions banner.
2. Map quality presets to Ghostscript `-dPDFSETTINGS`: low→`/screen`, medium→`/ebook`, high→`/printer`.
3. Main: spawn `gs` as a child process with a timeout (e.g. 120s for very large files), capture stderr, write to a temp output path.
4. If Ghostscript isn't available, fall back to the pdf-lib+sharp path: extract embedded images via pdf-lib's low-level object access, downsample with sharp, re-embed.
5. Compute original vs new file size, return both to renderer for a 'You saved X%' summary.
6. Renderer: quality selector (3 cards: Low/Medium/High with expected size-reduction hints), progress modal during processing, before/after size comparison bar on completion.

## 5. UI Requirements (this page specifically)
- Show a clear before/after file size comparison with a percentage-saved badge.
- Warn if selected quality is likely to noticeably degrade image-heavy PDFs.

## 6. Edge Cases & Error Handling
- Ghostscript missing → show install-instructions banner per OS (winget/choco, brew, apt) instead of failing silently.
- Already-tiny or scanned/text-only PDFs may not shrink — show a message rather than implying failure.
- Ghostscript process hangs → enforce timeout and surface a clear error.

## 7. Acceptance Criteria
- Compressing a sample image-heavy PDF at 'low' quality reduces file size by a meaningful margin (document actual % once tested).
- Output PDF still opens correctly and page count matches input.
- Missing-Ghostscript path shows the install banner instead of crashing.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
