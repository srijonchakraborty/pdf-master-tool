# 18. Protect PDF

**Phase:** 3 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Encrypt a PDF with a password to prevent unauthorized opening/editing.

## 2. Libraries / Tools
- qpdf (`qpdf --encrypt <user-pw> <owner-pw> 256 -- input.pdf output.pdf`) — note: pdf-lib does not support encryption, qpdf is required here

## 3. IPC Contract
- Channel: `pdf:protect-pdf`
- Input: `{ filePath: string, userPassword: string, ownerPassword?: string, permissions?: { printing?: boolean, copying?: boolean, modifying?: boolean } }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/protectPdf.ts`
- Renderer page: `src/renderer/pages/ProtectPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Reuse the qpdf resolver from Unlock PDF.
2. Renderer: password field (with confirm-password field), optional 'owner password' (advanced/collapsed section) for permission-restriction use cases, and checkboxes for allow printing / allow copying / allow modifying.
3. Main: build the qpdf `--encrypt` command with the appropriate permission flags (`--print=none`, `--extract=n`, `--modify=none`, etc. depending on unchecked permissions) and AES-256.
4. Spawn qpdf, capture stderr, return output path.

## 5. UI Requirements (this page specifically)
- Password + confirm-password fields with match validation, a permissions checklist section, and a clear summary before applying ('This PDF will require a password to open and printing will be disabled').

## 6. Edge Cases & Error Handling
- Password/confirm mismatch → inline validation, block submit.
- Empty password → block submit with a hint (must be non-empty to actually protect the file).
- qpdf missing → install banner.

## 7. Acceptance Criteria
- Setting a user password produces a PDF that prompts for a password when opened in a standard PDF viewer.
- Disabling 'allow printing' is respected by viewers that honor PDF permission flags.
- Correct password successfully opens/unlocks the protected file (round-trip test with the Unlock feature).

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
