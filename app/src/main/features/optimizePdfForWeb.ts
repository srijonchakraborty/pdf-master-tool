import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument } from 'pdf-lib'

export async function optimizePdfForWeb(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const inputBytes = fs.readFileSync(filePath)
  const pdfDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true })

  // pdf-lib re-serializes the PDF which linearizes the object tree.
  // We also strip creator metadata to reduce overhead.
  pdfDoc.setCreator('PDF Master Toolkit - Web Optimized')
  pdfDoc.setProducer('PDF Master Toolkit')

  // Save with object streams for better web performance (smaller xref tables)
  const outBytes = await pdfDoc.save({
    useObjectStreams: true,   // groups small objects together — reduces initial load size
    addDefaultPage: false,
  })

  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-web-optimized-${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, outBytes)

  return outputPath
}
