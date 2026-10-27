import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import { PDFDocument } from 'pdf-lib'
import { getGhostscriptPath } from '../binaries'

export interface RepairPdfOptions {
  filePath: string
}

export async function repairPdf(options: RepairPdfOptions): Promise<string> {
  const { filePath } = options
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-repaired-${Date.now()}.pdf`)

  const gsPath = getGhostscriptPath()

  if (gsPath) {
    try {
      return await new Promise<string>((resolve, reject) => {
        const args = [
          '-o', outputPath,
          '-sDEVICE=pdfwrite',
          '-dPDFSETTINGS=/prepress',
          filePath
        ]
        execFile(gsPath, args, { timeout: 120000 }, (err, _stdout, stderr) => {
          if (err) return reject(new Error(`Ghostscript error: ${err.message}\n${stderr}`))
          resolve(outputPath)
        })
      })
    } catch (e: any) {
      console.warn('Ghostscript repair failed, falling back to pdf-lib:', e.message)
      // Fallback to pdf-lib below
    }
  }

  // Use pdf-lib load/save as fallback (fixes minor corruption and bad xref tables)
  try {
    const pdfBytes = fs.readFileSync(filePath)
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
    const outBytes = await pdfDoc.save()
    fs.writeFileSync(outputPath, outBytes)
    return outputPath
  } catch (e: any) {
    throw new Error(`Could not repair this PDF: ${e.message}`)
  }
}

