import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument } from 'pdf-lib'

export interface FormFieldValue {
  name: string
  value: string | boolean
}

export interface PdfFormsOptions {
  filePath: string
  mode: 'fill' | 'detect'
  values?: FormFieldValue[]
  flatten?: boolean
}

export interface DetectedField {
  name: string
  type: string
  value: string | boolean
}

export async function detectFormFields(filePath: string): Promise<DetectedField[]> {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const pdfBytes = fs.readFileSync(filePath)
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const form = pdfDoc.getForm()
  const fields = form.getFields()

  return fields.map(field => {
    const type = field.constructor.name
      .replace('PDFTextField', 'text')
      .replace('PDFCheckBox', 'checkbox')
      .replace('PDFDropdown', 'dropdown')
      .replace('PDFRadioGroup', 'radio')
      .replace('PDFOptionList', 'optionList')
      .replace('PDFSignature', 'signature')
      .toLowerCase()

    let value: string | boolean = ''
    try {
      if (type === 'checkbox') {
        const cb = form.getCheckBox(field.getName())
        value = cb.isChecked()
      } else if (type === 'text') {
        const tf = form.getTextField(field.getName())
        value = tf.getText() || ''
      } else if (type === 'dropdown') {
        const dd = form.getDropdown(field.getName())
        value = dd.getSelected()[0] || ''
      }
    } catch {}

    return { name: field.getName(), type, value }
  })
}

export async function fillFormFields(options: PdfFormsOptions): Promise<string> {
  const { filePath, values = [], flatten = false } = options
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const pdfBytes = fs.readFileSync(filePath)
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const form = pdfDoc.getForm()

  for (const { name, value } of values) {
    try {
      const field = form.getField(name)
      const type = field.constructor.name

      if (type === 'PDFTextField') {
        form.getTextField(name).setText(String(value))
      } else if (type === 'PDFCheckBox') {
        if (value) form.getCheckBox(name).check()
        else form.getCheckBox(name).uncheck()
      } else if (type === 'PDFDropdown') {
        form.getDropdown(name).select(String(value))
      }
    } catch (e) {
      // Skip fields that don't exist or can't be set
      console.warn(`Could not fill field "${name}": ${(e as any).message}`)
    }
  }

  if (flatten) form.flatten()

  const outBytes = await pdfDoc.save()
  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-filled-${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, outBytes)
  return outputPath
}
