# 28. PDF Forms

**Phase:** 2 &nbsp;|&nbsp; **Status:** ⬜ Not Started &nbsp;|&nbsp; **Next Step:** Start at Step 1

## 1. Feature Summary
Create new interactive form fields on a PDF, detect existing AcroForm fields, and fill them out.

## 2. Libraries / Tools
- pdf-lib (`form.createTextField`/`createCheckBox`/`createRadioGroup`/`createDropdown` for creation; `form.getFields()` to detect existing fields; `field.setText()`/`.check()` etc. to fill)
- pdfjs-dist (render pages as the canvas backdrop for placing/filling fields visually)

## 3. IPC Contract
- Channel: `pdf:pdf-forms`
- Input: `{ filePath: string, mode: 'create'|'fill', fields?: FormFieldDef[], values?: Record<string, string|boolean> }`
- Output: `{ outputPath: string }`
- Main-process module: `src/main/features/pdfForms.ts`
- Renderer page: `src/renderer/pages/PdfFormsPage.tsx`

## 4. Step-by-Step Implementation

1. Renderer 'Create' mode: page-preview canvas with a palette of field types (Text, Checkbox, Radio Group, Dropdown, Signature placeholder) the user drag-places onto the page, each with a properties panel (field name, default value, required toggle, options list for dropdown/radio).
2. Renderer 'Fill' mode: main first calls pdf-lib's `form.getFields()` to detect existing fields in an uploaded PDF and returns their type/position/name; renderer then renders a normal-looking form UI (auto-generated from field types) for the user to fill in, overlaid at the correct positions on the page preview.
3. On save (create mode): send field definitions + positions to main via `pdf:pdf-forms-create`; main uses pdf-lib's form-field creation API to add each field at its position on the correct page.
4. On save (fill mode): send field name→value map to main via `pdf:pdf-forms-fill`; main sets each field's value via pdf-lib, then optionally calls `form.flatten()` if the user chooses 'flatten so it can no longer be edited' (offer this as a checkbox — flattening burns the values into the page as static content, useful for final submission copies).
5. Return output path.

## 5. UI Requirements (this page specifically)
- Two clearly separated modes (Create / Fill) selectable up front; Create mode has a drag-and-drop field palette like a lightweight form builder; Fill mode auto-renders a clean form matching each field's type directly over the page preview.
- A 'Flatten form after filling' checkbox in Fill mode, clearly explained ('prevents further edits, recommended before sending a final copy').

## 6. Edge Cases & Error Handling
- PDF has no existing form fields in Fill mode → clearly say so and suggest Create mode instead, rather than showing an empty confusing screen.
- Radio groups and dropdowns need their option lists handled distinctly from simple text/checkbox fields — don't collapse all field types into one generic input in the properties panel.

## 7. Acceptance Criteria
- Creating a text field, checkbox, and dropdown on a page and saving produces a PDF that shows real interactive fields when opened in Adobe Acrobat Reader.
- Detecting fields on a PDF that already has an AcroForm correctly lists all of them with correct types.
- Filling detected fields and saving (without flatten) still allows further editing in another PDF viewer; with flatten checked, the values become static and are no longer editable fields.

## 8. Resume Notes (update this section every session)
- **Last updated by:** _(fill in)_
- **What's done so far:** _(fill in)_
- **What's next:** _(fill in — be specific, e.g. "renderer page built, IPC handler not wired yet")_
- **Known issues / blockers:** _(fill in or write "none")_
