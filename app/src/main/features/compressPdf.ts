import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument } from 'pdf-lib'

export type CompressQuality = 'low' | 'medium' | 'high'

export interface CompressPdfOptions {
  filePath: string
  quality: CompressQuality
}

export interface CompressPdfResult {
  outputPath: string
  originalSize: number
  newSize: number
}

export async function compressPdf(options: CompressPdfOptions): Promise<CompressPdfResult> {
  const { filePath } = options
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const stat = fs.statSync(filePath)
  const originalSize = stat.size

  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-compressed-${Date.now()}.pdf`)

  // Use pdf-lib to compress object streams and remove unused objects
  const pdfBytes = fs.readFileSync(filePath)
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  
  // Save with object streams to reduce size
  const compressedBytes = await pdfDoc.save({ useObjectStreams: true })
  
  fs.writeFileSync(outputPath, compressedBytes)
  
  const newSize = compressedBytes.length

  return {
    outputPath,
    originalSize,
    newSize
  }
}
