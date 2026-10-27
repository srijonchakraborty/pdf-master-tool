# PDF Master Toolkit

Offline desktop app for everyday PDF work: merge, split, compress, convert Office files, OCR, sign, redact, and more. It runs locally with Electron, React, and TypeScript.

Specs and feature status live in `PROJECT_PLAN.md` and `PROGRESS.md`. Per-tool notes are in `docs/features/`.

## Stack

- Electron + electron-vite
- React 19 + TypeScript
- Tailwind CSS
- pdf-lib, pdfjs-dist, and tesseract.js
- Optional system tools: [Ghostscript](https://www.ghostscript.com/), [qpdf](https://qpdf.sourceforge.io/), and [LibreOffice](https://www.libreoffice.org/) (headless) for compress, repair, protect/unlock, and Office conversion

## Requirements

- Node.js 20 or newer
- npm

## Setup

```bash
cd app
npm install
npm run dev
```

## Scripts

Run these from the `app` folder:

| Command | What it does |
|---|---|
| `npm run dev` | Start the app with hot reload |
| `npm run typecheck` | Type-check main and renderer |
| `npm test` | Run Vitest |
| `npm run build` | Production build into `out/` |
| `npm run build:win` | Windows installer, portable, and MSIX |
| `npm run build:mac` | macOS package |
| `npm run build:linux` | Linux package |

Build output (`dist/`, `out/`) and dependencies (`node_modules/`) are not committed. Installers and local Ghostscript downloads (`gs.exe`, `gs_installer.exe`) stay on your machine.

## Optional tools

Some features need a program installed on the computer. The app detects them at runtime and shows a prompt when one is missing.

| Tool | Used for |
|---|---|
| Ghostscript | Compress, PDF/A, repair, PDF to JPG |
| qpdf | Protect and unlock |
| LibreOffice | Word, Excel, and PowerPoint conversion |
| Tesseract data | OCR (`app/resources/tessdata`) is included in the repo |

## Repo layout

```
app/                 Electron application
docs/                UI guide and feature specs
PROGRESS.md          What is done and what is next
PROJECT_PLAN.md      Architecture and conventions
android conversion planner/   Notes for a future mobile port
```
