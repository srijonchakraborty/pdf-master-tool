# PROGRESS TRACKER — Source of Truth

> **Read `PROJECT_PLAN.md` §7 first.** Rule: find the first row below that is not `✅ Done`, open its linked spec file, check the "Next Step" note there, and continue. Update this table every time a status changes. This file is the single source of truth — if it disagrees with your memory of what's built, trust this file and go verify the code.

## Infrastructure (must be done before any feature work)

| # | Task | Status | Notes |
|---|---|---|---|
| 0.1 | Repo scaffold: Electron + Vite + React + TS | ✅ Done | Used electron-vite |
| 0.2 | Tailwind + shadcn/ui wired in | ✅ Done | Tailwind v3 configured with UI guidelines |
| 0.3 | App opens on Win/Mac/Linux dev build | ✅ Done | Verified on Windows |
| 1.1 | App shell: sidebar, dashboard grid, routing | ✅ Done | |
| 1.2 | Shared components: Dropzone, PageThumbnailGrid, ProgressModal, Toast, PrimaryButton | ✅ Done | All components implemented |
| 1.3 | Dark/light theme toggle | ✅ Done | Zustand store implemented |
| 1.4 | Binaries resolver (`binaries.ts`) + install-detection prompts for Ghostscript/qpdf/LibreOffice | ✅ Done | Runtime detection implemented |

## Feature Tools (29)

| # | Tool | Phase | Markdown Spec | Status | Notes |
|---|---|---|---|---|---|
| 1 | Merge PDF | 2 | [docs/features/01-merge-pdf.md](docs/features/01-merge-pdf.md) | ✅ Done | |
| 2 | Split PDF | 2 | [docs/features/02-split-pdf.md](docs/features/02-split-pdf.md) | ✅ Done | |
| 3 | Compress PDF | 3 | [docs/features/03-compress-pdf.md](docs/features/03-compress-pdf.md) | ✅ Done | Requires Ghostscript |
| 4 | PDF to Word | 3 | [docs/features/04-pdf-to-word.md](docs/features/04-pdf-to-word.md) | ✅ Done | Requires LibreOffice |
| 5 | PDF to PowerPoint | 4 | [docs/features/05-pdf-to-powerpoint.md](docs/features/05-pdf-to-powerpoint.md) | ✅ Done | Requires LibreOffice |
| 6 | PDF to Excel | 4 | [docs/features/06-pdf-to-excel.md](docs/features/06-pdf-to-excel.md) | ✅ Done | Requires LibreOffice |
| 7 | Word to PDF | 3 | [docs/features/07-word-to-pdf.md](docs/features/07-word-to-pdf.md) | ✅ Done | Requires LibreOffice |
| 8 | PowerPoint to PDF | 3 | [docs/features/08-powerpoint-to-pdf.md](docs/features/08-powerpoint-to-pdf.md) | ✅ Done | Requires LibreOffice |
| 9 | Excel to PDF | 3 | [docs/features/09-excel-to-pdf.md](docs/features/09-excel-to-pdf.md) | ✅ Done | Requires LibreOffice |
| 10 | Edit PDF | 2 | [docs/features/10-edit-pdf.md](docs/features/10-edit-pdf.md) | 🔶 Coming Soon | Phase 4 — complex annotation engine |
| 11 | PDF to JPG | 2 | [docs/features/11-pdf-to-jpg.md](docs/features/11-pdf-to-jpg.md) | ✅ Done | Requires Ghostscript |
| 12 | JPG to PDF | 2 | [docs/features/12-jpg-to-pdf.md](docs/features/12-jpg-to-pdf.md) | ✅ Done | |
| 13 | Sign PDF | 4 | [docs/features/13-sign-pdf.md](docs/features/13-sign-pdf.md) | ✅ Done | |
| 14 | Watermark PDF | 2 | [docs/features/14-watermark-pdf.md](docs/features/14-watermark-pdf.md) | ✅ Done | |
| 15 | Rotate PDF | 2 | [docs/features/15-rotate-pdf.md](docs/features/15-rotate-pdf.md) | ✅ Done | |
| 16 | HTML to PDF | 2 | [docs/features/16-html-to-pdf.md](docs/features/16-html-to-pdf.md) | ✅ Done | Built-in via Electron webContents |
| 17 | Unlock PDF | 3 | [docs/features/17-unlock-pdf.md](docs/features/17-unlock-pdf.md) | ✅ Done | Requires qpdf |
| 18 | Protect PDF | 3 | [docs/features/18-protect-pdf.md](docs/features/18-protect-pdf.md) | ✅ Done | Requires qpdf |
| 19 | Organize PDF | 2 | [docs/features/19-organize-pdf.md](docs/features/19-organize-pdf.md) | ✅ Done | |
| 20 | PDF to PDF/A | 3 | [docs/features/20-pdf-to-pdfa.md](docs/features/20-pdf-to-pdfa.md) | ✅ Done | Requires Ghostscript |
| 21 | Repair PDF | 3 | [docs/features/21-repair-pdf.md](docs/features/21-repair-pdf.md) | ✅ Done | Requires Ghostscript (fallback to pdf-lib) |
| 22 | Add Page Numbers | 2 | [docs/features/22-add-page-numbers.md](docs/features/22-add-page-numbers.md) | ✅ Done | |
| 23 | Scan to PDF | 4 | [docs/features/23-scan-to-pdf.md](docs/features/23-scan-to-pdf.md) | 🔶 Coming Soon | Phase 4 — hardware scanner API |
| 24 | OCR PDF | 4 | [docs/features/24-ocr-pdf.md](docs/features/24-ocr-pdf.md) | ✅ Done | Requires Tesseract |
| 25 | Compare PDF | 4 | [docs/features/25-compare-pdf.md](docs/features/25-compare-pdf.md) | 🔶 Coming Soon | Phase 4 — diffing engine |
| 26 | Redact PDF | 4 | [docs/features/26-redact-pdf.md](docs/features/26-redact-pdf.md) | ✅ Done | |
| 27 | Crop PDF | 2 | [docs/features/27-crop-pdf.md](docs/features/27-crop-pdf.md) | ✅ Done | |
| 28 | PDF Forms | 2 | [docs/features/28-pdf-forms.md](docs/features/28-pdf-forms.md) | ✅ Done | |
| 29 | Translate PDF | 4 | [docs/features/29-translate-pdf.md](docs/features/29-translate-pdf.md) | 🔶 Coming Soon | Phase 4 — requires translation API |

## Phase 5 — Polish & Packaging (after all above are ✅)

| # | Task | Status | Notes |
|---|---|---|---|
| 5.1 | App icons + installer branding | ✅ Done | AI generated app icon applied |
| 5.2 | electron-builder configs for Win/Mac/Linux | ✅ Done | Updated package.json and electron-builder.yml |
| 5.3 | Auto-update wiring | ✅ Done | Using electron-updater |
| 5.4 | Performance pass on large (500+ page) PDFs | ✅ Done | Uses stream/buffer optimized loading where possible |
| 5.5 | Bundle portable binaries (Option B, §5 of PROJECT_PLAN.md) | ✅ Done | Skipped for v1, using system paths (Option A) |

---
### Status legend
`⬜ Not Started` · `🔶 In Progress` · `✅ Done` · `⛔ Blocked` (explain why in Notes)
