# PDF Toolkit Desktop App — Master Project Plan

> **Purpose of this document set:** This is a spec repo, not just a plan. Any human developer or AI coding agent should be able to open this folder cold — with zero prior context — and know exactly what the app is, what's built, and what to do next. If work stops at any point, the next session starts by reading `PROGRESS.md`, finds the first unfinished item, opens the matching file in `docs/features/`, and continues from there.

---

## 1. What we're building

A cross-platform (Windows, macOS, Linux) desktop application — an offline-first "Swiss army knife" for PDF files, similar in spirit to iLovePDF/Smallpdf but running locally as a desktop app. 29 tools total, listed in `PROGRESS.md`.

## 2. Tech Stack (decided — do not change without updating this file)

| Layer | Choice | Why |
|---|---|---|
| Shell | **Electron** | Mature, cross-platform, huge ecosystem, native menus/dialogs, can use `webContents.printToPDF` for HTML→PDF for free |
| UI framework | **React 18 + TypeScript** | Type safety across a 29-feature app matters; component reuse |
| Styling | **Tailwind CSS** + **shadcn/ui** components | Fast to build a modern, consistent look without reinventing components |
| Animation | **Framer Motion** | Smooth transitions, drag-drop feedback, progress states |
| State mgmt | **Zustand** | Lightweight, avoids Redux boilerplate for a tool-based app |
| Build tooling | **Vite** (renderer) + **electron-builder** (packaging) | Fast dev loop, reliable multi-OS packaging |
| IPC pattern | `contextBridge` + `ipcRenderer.invoke` (never `nodeIntegration: true`) | Security best practice |
| PDF core | **pdf-lib** (create/merge/split/rotate/watermark/forms/page numbers) | Pure JS, no native deps, cross-platform |
| PDF rendering | **pdfjs-dist** | Render pages to canvas for previews, thumbnails, page picker UI |
| Heavy/native ops | **Ghostscript** (compress, PDF/A, repair) and **qpdf** (encrypt/decrypt/repair) | Industry-standard, must be bundled or installed per OS — see §5 |
| Office conversions | **LibreOffice headless** (`soffice --headless --convert-to`) | Only reliable free cross-platform engine for Word/Excel/PowerPoint ⇄ PDF |
| OCR | **tesseract.js** | Pure JS/WASM, no native OCR engine install needed |
| Image ops | **sharp** | Fast native image resizing/compression for JPG⇄PDF |
| Table extraction | Python **camelot-py** or **pdfplumber**, invoked via child_process | Best-in-class table detection; document as optional dependency |
| Digital signatures | **node-signpdf** + **node-forge** | Real PKCS#7 signing, not just a stamped image |
| Diff (Compare PDF) | **diff** (text) + **pixelmatch** (visual) | Covers both text-level and pixel-level comparison |
| Translation | Google Cloud Translation API or DeepL API (configurable) | No good offline translation engine exists yet; document as "requires API key" feature |

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────┐
│  Renderer (React + TS, sandboxed, no Node)   │
│  - Feature pages (one per tool)              │
│  - Drag/drop zone, file picker, previews      │
│  - Calls window.api.<feature>(...) via preload│
└───────────────────┬───────────────────────────┘
                     │ contextBridge (typed IPC)
┌───────────────────▼───────────────────────────┐
│  Preload script (exposes a narrow, typed API)  │
└───────────────────┬───────────────────────────┘
┌───────────────────▼───────────────────────────┐
│  Main process (Node, full access)              │
│  - IPC handlers, one module per feature        │
│  - Spawns Ghostscript/qpdf/LibreOffice as      │
│    child processes when needed                 │
│  - Temp file management, cleanup                │
└───────────────────┬───────────────────────────┘
┌───────────────────▼───────────────────────────┐
│  External binaries (bundled or system):        │
│  Ghostscript · qpdf · LibreOffice · Python(opt) │
└─────────────────────────────────────────────────┘
```

**Rule:** every feature module in `main/features/*.ts` exposes exactly one function with a typed input/output contract. The renderer never touches the filesystem directly — always through IPC.

## 4. Folder Structure (target — create as you go)

```
/app
  /src
    /main               # Electron main process
      /features         # one file per tool: mergePdf.ts, splitPdf.ts, ...
      ipcHandlers.ts
      binaries.ts        # resolves paths to gs/qpdf/soffice per OS
      main.ts
      preload.ts
    /renderer            # React app
      /pages             # one page per tool, routed
      /components        # shared UI: Dropzone, PageGrid, ProgressBar, ToolCard
      /store              # zustand stores
      App.tsx
      main.tsx
  /resources              # bundled binaries per platform (see §5)
  package.json
  electron-builder.yml
  vite.config.ts
  tailwind.config.js
/docs                     # THIS spec repo — keep alongside /app, do not delete
```

## 5. Bundling external binaries — read this before Phase 1

Ghostscript, qpdf, and LibreOffice are **not npm packages** — they're system binaries. Two options, pick one and record the decision here once made:

- **Option A (simpler, recommended to start):** Detect if installed on the user's system at runtime; if missing, show an in-app prompt with a download link per OS. Ship v1 this way.
- **Option B (better UX, more work):** Bundle portable binaries per platform inside `/resources/{win,mac,linux}/` and reference them via `binaries.ts`. Do this in a later polish phase once all features work with Option A.

Do not attempt Option B on day one — it multiplies build complexity (different binaries per OS/arch) before there's anything working to test.

## 6. Development Phases

Work strictly in this order. Each phase must be "done" (see `PROGRESS.md` checkboxes) before starting the next, except Phase 2+ features can be built in any order within the phase.

- **Phase 0 — Project scaffold**: Electron + Vite + React + TS + Tailwind + shadcn/ui wired up, empty window opens on all 3 OSes, hot reload works.
- **Phase 1 — Shell & design system**: App shell (sidebar nav of 29 tools, home/dashboard grid), shared components (Dropzone, PageThumbnailGrid, ProgressModal, Toast), dark/light theme. No PDF logic yet — use dummy handlers.
- **Phase 2 — Pure pdf-lib features (no external binaries)**: Merge, Split, Rotate, Organize, Watermark, Add Page Numbers, Crop, JPG→PDF, PDF→JPG (via pdfjs), PDF Forms (basic), Edit PDF (basic text/annotation).
- **Phase 3 — External-binary features**: Compress, PDF/A, Repair, Protect, Unlock (Ghostscript/qpdf), Word/PPT/Excel ⇄ PDF (LibreOffice), HTML→PDF (Electron printToPDF, no external binary actually needed — could move to Phase 2).
- **Phase 4 — Advanced features**: OCR, Scan to PDF, Sign PDF, Compare PDF, Redact PDF, PDF to Excel (table extraction), PDF to PowerPoint, Translate PDF.
- **Phase 5 — Polish & packaging**: Icons, installers (NSIS/dmg/AppImage), auto-update, error telemetry (opt-in), performance pass on large PDFs, bundle binaries (Option B from §5 if desired).

## 7. How to resume work (read this every session)

1. Open `PROGRESS.md`.
2. Find the first row not marked `✅ Done`.
3. Open the matching file in `docs/features/NN-feature-name.md`.
4. Read its **Status** field and **Next Step** note (the last developer/agent should have left one — if it's empty, start from Step 1 in that file).
5. Implement, test against the **Acceptance Criteria** in that file, then:
   - Update the feature file's Status + Next Step.
   - Update the row in `PROGRESS.md`.
   - Commit with message `feat(<feature-slug>): <what changed>`.
6. Never mark something ✅ Done unless all acceptance criteria pass.

## 8. Coding Conventions

- TypeScript strict mode on. No `any` without a comment explaining why.
- One feature = one main-process module + one renderer page + one entry in the router + one entry in `PROGRESS.md`. Do not partially wire a feature across sessions without leaving a note.
- All child_process calls must have: timeout, stderr capture, and a typed error result — never let a crashed subprocess hang the UI.
- Every feature must clean up temp files (success or failure) — use a `try/finally`.
- Every feature's IPC handler validates input file existence and PDF validity before processing.
- Commit small, commit often. One feature per commit where possible.

## 9. UI/UX

See `docs/UI_DESIGN_GUIDE.md` — this governs all visual work. Do not deviate without updating that file.

## 10. Document index

- `PROGRESS.md` — the living checklist, source of truth for "what's next."
- `docs/UI_DESIGN_GUIDE.md` — visual design system.
- `docs/features/01-merge-pdf.md` … `docs/features/29-translate-pdf.md` — one detailed step-by-step spec per tool.
