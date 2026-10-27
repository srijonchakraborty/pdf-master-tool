import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'

export interface SplitPdfOptions {
  filePath: string
  mode: 'ranges' | 'everyPage' | 'selection'
  ranges?: string
  selectedPages?: number[] // 1-indexed for UI, but we'll convert to 0-indexed internally
}

// Parses a string like "1-3, 5, 8-10" into a unique sorted array of 0-indexed pages
export function parsePageRanges(rangeString: string, maxPages: number): number[] {
  const pages = new Set<number>()
  const parts = rangeString.split(',').map(p => p.trim())

  for (const part of parts) {
    if (!part) continue
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim())
      const start = Math.max(1, parseInt(startStr, 10) || 1)
      const end = Math.min(maxPages, parseInt(endStr, 10) || maxPages)

      for (let i = start; i <= end; i++) {
        pages.add(i - 1)
      }
    } else {
      const pageNum = parseInt(part, 10)
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
        pages.add(pageNum - 1)
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b)
}

export async function splitPdf(options: SplitPdfOptions): Promise<string> {
  const { filePath, mode, ranges, selectedPages } = options
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const pdfBytes = fs.readFileSync(filePath)
  const sourcePdf = await PDFDocument.load(pdfBytes)
  const totalPages = sourcePdf.getPageCount()
  
  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')

  if (mode === 'everyPage') {
    // Generate multiple PDFs and zip them using JSZip
    const zipPath = path.join(tempDir, `${baseName}-split-${Date.now()}.zip`)
    const zip = new JSZip()

    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create()
      const [copiedPage] = await newPdf.copyPages(sourcePdf, [i])
      newPdf.addPage(copiedPage)
      
      const newPdfBytes = await newPdf.save()
      zip.file(`${baseName}-page-${i + 1}.pdf`, newPdfBytes)
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    fs.writeFileSync(zipPath, zipBuffer)
    return zipPath
  }

  // Handle 'ranges' or 'selection' mode
  let targetIndices: number[] = []

  if (mode === 'selection' && selectedPages && selectedPages.length > 0) {
    targetIndices = selectedPages.map(p => p - 1).filter(p => p >= 0 && p < totalPages)
  } else if (mode === 'ranges' && ranges) {
    targetIndices = parsePageRanges(ranges, totalPages)
  }

  if (targetIndices.length === 0) {
    throw new Error('No valid pages selected or specified in range.')
  }

  const newPdf = await PDFDocument.create()
  const copiedPages = await newPdf.copyPages(sourcePdf, targetIndices)
  copiedPages.forEach(p => newPdf.addPage(p))

  const newPdfBytes = await newPdf.save()
  const outputPath = path.join(tempDir, `${baseName}-split-${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, newPdfBytes)

  return outputPath
}
