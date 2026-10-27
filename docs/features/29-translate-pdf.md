# 29. Translate PDF

**Phase:** 4 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Translate the text content of a PDF into another language while preserving the original layout as closely as possible.

## 2. Libraries / Tools
- pdfjs-dist (extract text runs with position/font metadata per page)
- A translation API — Google Cloud Translation API or DeepL API, user-configurable, requires the user to supply their own API key (document clearly: this feature needs an internet connection and an API key, unlike the rest of the app which is fully offline)
- pdf-lib (rebuild the page: keep the original page as a background image render, or replace text runs in place, covering original text with a background-color box and drawing the translated text in the same position/size)

## 3. IPC Contract
- Channel: `pdf:translate-pdf`
- Input: `{ filePath: string, targetLanguage: string, apiKey: string, provider: 'google'|'deepl' }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/translatePdf.ts`
- Renderer page: `src/renderer/pages/TranslatePdfPage.tsx`

## 4. Step-by-Step Implementation

1. Settings: add an app-level Settings page (or a per-use prompt) where the user enters their translation API key and preferred provider; store it securely (OS keychain via `keytar`, not plain text) for reuse.
2. Main: extract per-page text runs with pdfjs-dist including position, font size, and approximate bounding box for each run.
3. Batch the extracted text and call the chosen translation API (respect API batch/size limits — chunk requests for large documents).
4. Rebuild each page: render the original page as a background image (to preserve all non-text visual layout, images, lines, etc. exactly), draw a background-colored rectangle over each original text run's bounding box (sampled from the nearby page background color, typically white), then draw the translated text in that same box using pdf-lib, auto-shrinking font size if the translated string is significantly longer than the original run.
5. This produces a strong visual approximation but is not pixel-perfect for complex layouts (multi-column text, right-to-left languages, CJK line-wrapping) — document this honestly in the UI as 'best-effort layout preservation.'
6. Return output path.

## 5. UI Requirements (this page specifically)
- A one-time Settings section for API key/provider entry, a target-language dropdown on the tool page itself, a progress modal noting 'this requires internet access', and honest UI copy about best-effort layout preservation.

## 6. Edge Cases & Error Handling
- No API key configured → guide the user to Settings rather than failing with a raw API error.
- API request fails/rate-limited → clear retry-able error, and process in a way that doesn't lose already-translated pages (translate and rebuild page-by-page, not all-or-nothing).
- Translated text significantly longer than the original (common when translating into e.g. German or Finnish) → auto-shrink font size within a reasonable minimum, and note that severe cases may still overflow — this is an inherent limit of layout-preserving translation, not a bug to fully solve.

## 7. Acceptance Criteria
- Translating a simple single-column English PDF into another supported language produces a PDF with translated text roughly in the same visual positions as the original.
- Missing API key is caught before attempting the API call, with a clear path to Settings.
- A multi-page document translates and rebuilds page-by-page, so a failure on one page doesn't lose progress on others already completed.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
