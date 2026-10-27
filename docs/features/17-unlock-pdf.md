# 17. Unlock PDF

**Phase:** 3 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Remove password protection and usage restrictions from a PDF (requires knowing the current password, or removing owner-only restrictions).

## 2. Libraries / Tools
- qpdf (`qpdf --decrypt --password=<pw> input.pdf output.pdf`)

## 3. IPC Contract
- Channel: `pdf:unlock-pdf`
- Input: `{ filePath: string, password: string }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/unlockPdf.ts`
- Renderer page: `src/renderer/pages/UnlockPdfPage.tsx`

## 4. Step-by-Step Implementation

1. Extend `binaries.ts` to resolve `qpdf` per OS.
2. Renderer: password input field, clear messaging that the current password is required to unlock (this tool is not a password-cracking tool).
3. Main: spawn `qpdf --decrypt --password=<password> <input> <output>`, capture stderr for wrong-password detection.
4. On qpdf exit code indicating auth failure, return a typed error the renderer maps to 'Incorrect password.'
5. Return output path on success.

## 5. UI Requirements (this page specifically)
- Single password field with show/hide toggle, clear inline error on wrong password.

## 6. Edge Cases & Error Handling
- Wrong password → specific, friendly error, not a generic failure.
- qpdf not installed → install-instructions banner.
- File isn't actually encrypted → detect and simply say 'This PDF is not password-protected' rather than erroring.

## 7. Acceptance Criteria
- Providing the correct password on an encrypted sample PDF produces an unencrypted copy that opens without a prompt.
- Wrong password shows a clear, specific error.
- An already-unlocked PDF is handled gracefully, not as an error.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
