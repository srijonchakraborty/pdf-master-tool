# UI Design Guide — Modern, Eye-Catching Desktop App

This governs every screen in the app. A coding agent building any feature page must follow this rather than inventing new patterns.

## 1. Overall Feel

Think **Linear / Raycast / Notion desktop** — clean, confident, lots of whitespace, subtle depth, snappy motion. Not a generic Bootstrap admin panel. Avoid: default browser form controls, harsh drop shadows, clip-art icons, cramped spacing.

## 2. Layout

- **Left sidebar** (collapsible, ~240px): app logo/name at top, search box, then the 29 tools grouped into categories:
  - *Organize*: Merge, Split, Rotate, Organize, Crop
  - *Convert*: PDF↔Word, PDF↔PowerPoint, PDF↔Excel, PDF↔JPG, HTML to PDF, PDF to PDF/A
  - *Edit*: Edit PDF, Watermark, Add Page Numbers, PDF Forms, Redact
  - *Security*: Protect, Unlock, Sign, Compare
  - *Optimize & Recover*: Compress, Repair, OCR, Scan to PDF, Translate
- **Home/Dashboard view**: a responsive grid of "tool cards" (icon + name + one-line description), each opening its tool page. This is the first screen the user sees.
- **Tool page layout**: centered drop-zone at top (when no file loaded) → once a file is loaded, switch to a two-pane view: left = page thumbnails/preview, right = options panel + primary action button (sticky at bottom).

## 3. Color System (CSS variables — define once, reuse everywhere)

```css
:root {
  --bg-primary: #0f1115;        /* dark mode default */
  --bg-secondary: #171a21;
  --bg-elevated: #1f232c;
  --border-subtle: #2a2f3a;
  --text-primary: #f4f5f7;
  --text-secondary: #9aa1ac;
  --accent: #6d5bff;             /* brand purple — primary buttons, active nav item */
  --accent-hover: #8172ff;
  --success: #2fd170;
  --warning: #f5a524;
  --danger: #f5455c;
}
```
Light mode: invert bg/text roles, keep `--accent` the same for brand consistency. Ship dark mode as default; add a light/dark toggle in Phase 1.

## 4. Typography

- UI font: **Inter** (or system-ui fallback) — clean, modern, excellent at small sizes.
- Headings: 600 weight, tight letter-spacing (-0.01em).
- Body: 400 weight, 14–15px base.
- Never use pure black/white text — use the token colors above for softer contrast.

## 5. Components (build once in `/components`, reuse everywhere)

- **ToolCard** — icon, title, description, hover lift (translateY -2px + shadow), used on the dashboard grid.
- **Dropzone** — large dashed-border rounded-xl area, changes to solid accent border + subtle glow when dragging a file over it. Icon + "Drag & drop your PDF here, or click to browse."
- **PageThumbnailGrid** — draggable/reorderable grid of page thumbnails (for Merge, Split, Organize, Rotate, Delete pages). Use `pdfjs-dist` to render thumbnails; support multi-select with checkboxes, drag-to-reorder, right-click context menu (rotate/delete/extract).
- **ProgressModal** — indeterminate or percentage progress bar with a friendly status line ("Compressing page 4 of 12…"), non-blocking, cancel button where feasible.
- **PrimaryButton** — accent-colored, rounded-lg, subtle scale-down on click (Framer Motion `whileTap={{scale: 0.97}}`).
- **Toast** — success/error notifications, bottom-right, auto-dismiss with a progress-bar edge.
- **EmptyState** — friendly illustration + text for "no file loaded yet" states.

## 6. Motion

- Page transitions: fade + slight upward slide (150–200ms).
- Dropzone: scale + glow on drag-over.
- Thumbnail reordering: Framer Motion `layout` animations so pages smoothly slide into place.
- Keep all durations short (150–250ms) — snappy, never sluggish.

## 7. Icons

Use **lucide-react** icons throughout (consistent stroke width, modern look) — one distinct icon per tool, matched to its function (e.g., a scissors icon for Split, a lock for Protect).

## 8. Accessibility & polish details

- Every primary action reachable by keyboard (Tab order, Enter to submit).
- Loading and disabled states clearly styled (reduced opacity + cursor: not-allowed).
- Support native OS drag-and-drop from Finder/Explorer directly onto the Dropzone and onto the app icon/dock.
- Respect OS-level dark/light preference on first launch, then let the user override.

## 9. Reference

If unsure how a screen should look, default to matching the visual density and polish of Linear.app or Raycast — not a generic admin dashboard template.
