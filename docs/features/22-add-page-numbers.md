# 22. Add Page Numbers

**Phase:** 2 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Insert customizable page numbers into a PDF document.

## 2. Libraries / Tools
- pdf-lib (`drawText` for the page-number string at a computed position on every page)

## 3. IPC Contract
- Channel: `pdf:add-page-numbers`
- Input: `{ filePath: string, position: 'bottom-center'|'bottom-right'|'bottom-left'|'top-center'|'top-right'|'top-left', format: string, startAt: number, fontSize: number, pages: 'all'|number[] }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/addPageNumbers.ts`
- Renderer page: `src/renderer/pages/AddPageNumbersPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: position picker (a simple 3x2 grid of corner/center options mimicking common word-processor page-number pickers), a format template input supporting tokens like `Page {n} of {total}` or just `{n}`, a 'start numbering at' field (useful when a cover page shouldn't be numbered), and font size.
2. Live preview on the first-page thumbnail showing roughly where the number will land.
3. Send config to main via `pdf:add-page-numbers`.
4. Main: for each page (respecting the 'start at' offset and any excluded pages), compute the formatted string by substituting `{n}`/`{total}` tokens, measure its width with the chosen font to properly right/center/left-align it, and `drawText` at the computed x/y.
5. Save and return output path.

## 5. UI Requirements (this page specifically)
- Corner/center position picker, live single-page preview, and a format-string input with a couple of quick-preset buttons ('1', '1 of N', 'Page 1').

## 6. Edge Cases & Error Handling
- Text alignment must account for actual rendered string width at the chosen font/size — don't just guess a fixed offset, or right/center alignment will look wrong for different digit counts (e.g. '9' vs '10').
- 'Start at' values other than 1 (e.g. numbering starts at 3 because of a cover page) must be handled correctly across the whole document.

## 7. Acceptance Criteria
- Page numbers appear at the exact chosen corner/center position on every applicable page.
- 'Page {n} of {total}' format renders the correct total page count.
- A custom start number correctly offsets the sequence across all pages.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
