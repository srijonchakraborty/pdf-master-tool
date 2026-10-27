# 25. Compare PDF

**Phase:** 4 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Compare two PDF documents side by side and highlight differences, both textually and visually.

## 2. Libraries / Tools
- pdf-parse or pdfjs-dist text-content extraction (per-page text) + the `diff` npm package (word/line-level diff)
- pdfjs-dist page rendering + `pixelmatch` (pixel-level visual diff, useful for layout/image changes text-diff won't catch)

## 3. IPC Contract
- Channel: `pdf:compare-pdf`
- Input: `{ filePathA: string, filePathB: string, mode: 'text'|'visual'|'both' }`
- Output: `{ textDiff?: DiffResult, visualDiffImagePaths?: string[] }`
- Main-process module: `src/main/features/comparePdf.ts`
- Renderer page: `src/renderer/pages/ComparePdfPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer: two-file dropzone (File A / File B), mode toggle (Text diff / Visual diff / Both), then a side-by-side viewer once processed.
2. Text mode — main: extract text per page from both files, run `diff.diffWords` (or `diffLines`) per matching page pair, return structured additions/removals/unchanged runs.
3. Visual mode — main: render matching pages from both files to same-size canvases via pdfjs-dist, run `pixelmatch` to produce a difference-highlight image per page pair (differences shown in a highlight color over a dimmed background).
4. Renderer: side-by-side scrollable panes with synchronized scrolling; text mode highlights additions in green and removals in red inline; visual mode shows the pixelmatch diff image overlay with a toggle to flip between 'A', 'B', and 'Diff' views per page.
5. Handle documents with different page counts by aligning on page index up to the shorter document's length, and clearly flagging extra pages in the longer one as wholly added/removed.

## 5. UI Requirements (this page specifically)
- Side-by-side dual-pane layout with synced scrolling, a mode toggle (Text/Visual/Both), inline green/red highlighting for text diffs, and an A/B/Diff view switch for visual diffs.
- A summary bar at top: 'X pages changed, Y pages identical, Z pages added/removed.'

## 6. Edge Cases & Error Handling
- Different page counts between the two files → clearly flag added/removed pages rather than silently misaligning comparisons.
- Very large documents → run diffing incrementally/paginated rather than computing everything upfront and blocking the UI.

## 7. Acceptance Criteria
- Two versions of a text document with a few changed sentences show exactly those sentences highlighted as changed, unchanged text shown as unchanged.
- Two visually identical PDFs report zero differences.
- A page added in one version is clearly flagged rather than causing misaligned comparisons on subsequent pages.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
