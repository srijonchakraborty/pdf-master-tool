import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument } from 'pdf-lib'

export async function mergePdfFiles(filePaths: string[]): Promise<string> {
  if (!filePaths || filePaths.length < 2) {
    throw new Error('At least two PDF files are required for merging.')
  }

  const mergedPdf = await PDFDocument.create()

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    try {
      const pdfBytes = fs.readFileSync(filePath)
      const pdf = await PDFDocument.load(pdfBytes)
      
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page)
      })
    } catch (err: any) {
      throw new Error(`Failed to load or merge file ${path.basename(filePath)}. It may be corrupted or password protected. Original error: ${err.message}`)
    }
  }

  const mergedPdfBytes = await mergedPdf.save()
  
  // Save to a temporary file
  const tempDir = os.tmpdir()
  const outputPath = path.join(tempDir, `merged-${Date.now()}.pdf`)
  
  fs.writeFileSync(outputPath, mergedPdfBytes)
  
  return outputPath
}
