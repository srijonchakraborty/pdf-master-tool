import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import { mergePdfFiles } from './features/mergePdf'
import { splitPdf, SplitPdfOptions } from './features/splitPdf'
import { compressPdf, CompressPdfOptions } from './features/compressPdf'
import { rotatePdf, RotationEntry } from './features/rotatePdf'
import { watermarkPdf, WatermarkOptions } from './features/watermarkPdf'
import { addPageNumbers, AddPageNumbersOptions } from './features/addPageNumbers'
import { organizePdf } from './features/organizePdf'
import { mergeOrganizePdf, MergeOrganizeOptions } from './features/mergeOrganizePdf'
import { jpgToPdf } from './features/jpgToPdf'
import { pdfToJpgZip } from './features/pdfToJpg'
import { unlockPdf } from './features/unlockPdf'
import { protectPdf, ProtectPdfOptions } from './features/protectPdf'
import { repairPdf } from './features/repairPdf'
import { pdfToPdfa } from './features/pdfToPdfa'
import { convertWithLibreOffice } from './features/libreOfficeConvert'
import { cropPdf } from './features/cropPdf'
import { htmlToPdf, HtmlToPdfOptions } from './features/htmlToPdf'
import { mdToPdf, MdToPdfOptions } from './features/mdToPdf'
import { signPdf, SignPdfOptions } from './features/signPdf'
import { redactPdf, RedactionBox } from './features/redactPdf'
import { detectFormFields, fillFormFields, PdfFormsOptions } from './features/pdfForms'
import { recognizeImageText, recognizeImageBoxes } from './features/ocrPdf'
import { translateText } from './features/translatePdf'
import { optimizePdfForWeb } from './features/optimizePdfForWeb'
import { extractAssetsAsZip } from './features/extractAssets'
import { epubToPdf } from './features/epubToPdf'
import { spellcheckText } from './features/spellcheckPdf'
import { buildCorrectedPdf } from './features/buildCorrectedPdf'
import { saveAnnotatedPdf, SaveAnnotatedPdfOptions } from './features/saveAnnotatedPdf'
import fs from 'fs'
import path from 'path'
import os from 'os'

export function setupIpcHandlers(): void {
  ipcMain.handle('ping', () => 'pong')

  // --- Binary detection (Native JS fallbacks integrated, all features active) ---
  ipcMain.handle('pdf:check-ghostscript', () => true)
  ipcMain.handle('pdf:check-qpdf', () => true)
  ipcMain.handle('pdf:check-libreoffice', () => true)

  // --- Merge PDF ---
  ipcMain.handle('pdf:merge-pdf', async (_e, args: { filePaths: string[] }) => {
    try { return { success: true, outputPath: await mergePdfFiles(args.filePaths) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Split PDF ---
  ipcMain.handle('pdf:split-pdf', async (_e, args: SplitPdfOptions) => {
    try { return { success: true, outputPath: await splitPdf(args) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Compress PDF ---
  ipcMain.handle('pdf:compress-pdf', async (_e, args: CompressPdfOptions) => {
    try { return { success: true, ...(await compressPdf(args)) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Rotate PDF ---
  ipcMain.handle('pdf:rotate-pdf', async (_e, args: { filePath: string, rotations: RotationEntry[] }) => {
    try { return { success: true, outputPath: await rotatePdf(args.filePath, args.rotations) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Watermark PDF ---
  ipcMain.handle('pdf:watermark-pdf', async (_e, args: WatermarkOptions) => {
    try { return { success: true, outputPath: await watermarkPdf(args) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Add Page Numbers ---
  ipcMain.handle('pdf:add-page-numbers', async (_e, args: AddPageNumbersOptions) => {
    try { return { success: true, outputPath: await addPageNumbers(args) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Organize PDF ---
  ipcMain.handle('pdf:organize-pdf', async (_e, args: { filePath: string, pageOrder: number[] }) => {
    try { return { success: true, outputPath: await organizePdf(args.filePath, args.pageOrder) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Merge & Organize PDF ---
  ipcMain.handle('pdf:merge-organize-pdf', async (_e, args: MergeOrganizeOptions) => {
    try { return { success: true, outputPath: await mergeOrganizePdf(args) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- JPG to PDF ---
  ipcMain.handle('pdf:jpg-to-pdf', async (_e, args: { filePaths: string[], pageSize: 'fit' | 'a4' | 'letter' }) => {
    try { return { success: true, outputPath: await jpgToPdf(args.filePaths, args.pageSize) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- PDF to JPG ---
  ipcMain.handle('pdf:pdf-to-jpg', async (_e, args: { filePath: string, dpi: number, quality: number }) => {
    try {
      const outputPath = await pdfToJpgZip({ filePath: args.filePath, mode: 'renderPages', dpi: args.dpi, quality: args.quality })
      return { success: true, outputPath }
    }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Unlock PDF ---
  ipcMain.handle('pdf:unlock-pdf', async (_e, args: { filePath: string, password: string }) => {
    try { return { success: true, outputPath: await unlockPdf(args.filePath, args.password) } }
    catch (e: any) {
      if (e.message === 'WRONG_PASSWORD') return { success: false, error: 'WRONG_PASSWORD' }
      return { success: false, error: e.message }
    }
  })

  // --- Protect PDF ---
  ipcMain.handle('pdf:protect-pdf', async (_e, args: ProtectPdfOptions) => {
    try { return { success: true, outputPath: await protectPdf(args) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Repair PDF ---
  ipcMain.handle('pdf:repair-pdf', async (_e, args: { filePath: string }) => {
    try { return { success: true, outputPath: await repairPdf(args) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- PDF to PDF/A ---
  ipcMain.handle('pdf:pdf-to-pdfa', async (_e, args: { filePath: string }) => {
    try { return { success: true, outputPath: await pdfToPdfa(args.filePath) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- PDF to Word (LibreOffice) ---
  ipcMain.handle('pdf:pdf-to-word', async (_e, args: { filePath: string }) => {
    try { return { success: true, outputPath: await convertWithLibreOffice(args.filePath, 'docx') } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- PDF to PowerPoint (LibreOffice) ---
  ipcMain.handle('pdf:pdf-to-powerpoint', async (_e, args: { filePath: string }) => {
    try { return { success: true, outputPath: await convertWithLibreOffice(args.filePath, 'pptx') } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- PDF to Excel (LibreOffice) ---
  ipcMain.handle('pdf:pdf-to-excel', async (_e, args: { filePath: string }) => {
    try { return { success: true, outputPath: await convertWithLibreOffice(args.filePath, 'xlsx') } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Word to PDF (LibreOffice) ---
  ipcMain.handle('pdf:word-to-pdf', async (_e, args: { filePath: string }) => {
    try { return { success: true, outputPath: await convertWithLibreOffice(args.filePath, 'pdf') } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- PowerPoint to PDF (LibreOffice) ---
  ipcMain.handle('pdf:powerpoint-to-pdf', async (_e, args: { filePath: string }) => {
    try { return { success: true, outputPath: await convertWithLibreOffice(args.filePath, 'pdf') } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Excel to PDF (LibreOffice) ---
  ipcMain.handle('pdf:excel-to-pdf', async (_e, args: { filePath: string }) => {
    try { return { success: true, outputPath: await convertWithLibreOffice(args.filePath, 'pdf') } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Crop PDF ---
  ipcMain.handle('pdf:crop-pdf', async (_e, args: { filePath: string, cropBox: any, pages: 'all' | number[] }) => {
    try { return { success: true, outputPath: await cropPdf(args.filePath, args.cropBox, args.pages) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- HTML to PDF ---
  ipcMain.handle('pdf:html-to-pdf', async (_e, args: HtmlToPdfOptions) => {
    try { return { success: true, outputPath: await htmlToPdf(args) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- MD to PDF ---
  ipcMain.handle('pdf:md-to-pdf', async (_e, args: MdToPdfOptions) => {
    try { return { success: true, outputPath: await mdToPdf(args) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Sign PDF ---
  ipcMain.handle('pdf:sign-pdf', async (_e, args: SignPdfOptions) => {
    try { return { success: true, outputPath: await signPdf(args) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Redact PDF ---
  ipcMain.handle('pdf:redact-pdf', async (_e, args: { filePath: string, redactions: RedactionBox[] }) => {
    try { return { success: true, outputPath: await redactPdf(args.filePath, args.redactions) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- PDF Forms: detect fields ---
  ipcMain.handle('pdf:detect-form-fields', async (_e, args: { filePath: string }) => {
    try {
      const fields = await detectFormFields(args.filePath)
      return { success: true, fields }
    }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- PDF Forms: fill fields ---
  ipcMain.handle('pdf:fill-form', async (_e, args: PdfFormsOptions) => {
    try { return { success: true, outputPath: await fillFormFields(args) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- OCR PDF Images (offline Tesseract) ---
  ipcMain.handle('pdf:recognize-image-text', async (_e, args: { dataUrl: string; language: string }) => {
    try {
      const text = await recognizeImageText(args.dataUrl, args.language)
      return { success: true, text }
    } catch (e: any) { return { success: false, error: e.message } }
  })

  ipcMain.handle('pdf:recognize-image-boxes', async (_e, args: { dataUrl: string; language: string }) => {
    try {
      const result = await recognizeImageBoxes(args.dataUrl, args.language)
      return { success: true, ...result }
    } catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Optimize PDF for Web ---
  ipcMain.handle('pdf:optimize-for-web', async (_e, args: { filePath: string }) => {
    try { return { success: true, outputPath: await optimizePdfForWeb(args.filePath) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Extract Assets from PDF ---
  ipcMain.handle('pdf:extract-assets', async (_e, args: { filePath: string }) => {
    try { return { success: true, outputPath: await extractAssetsAsZip(args.filePath) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- EPUB to PDF ---
  ipcMain.handle('pdf:epub-to-pdf', async (_e, args: { filePath: string }) => {
    try { return { success: true, outputPath: await epubToPdf(args.filePath) } }
    catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Spellcheck PDF (extract text + LanguageTool API) ---
  ipcMain.handle('pdf:spellcheck-text', async (_e, args: { text: string; language: string }) => {
    try {
      const result = await spellcheckText(args.text, args.language)
      return { success: true, ...result }
    } catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Build corrected PDF from spellchecked text ---
  ipcMain.handle('pdf:build-corrected-pdf', async (_e, args: { originalPath: string; correctedText: string }) => {
    try {
      const outputPath = await buildCorrectedPdf(args.originalPath, args.correctedText)
      return { success: true, outputPath }
    } catch (e: any) { return { success: false, error: e.message } }
  })

  // --- PDF to Text (plain text extraction, saved as .txt) ---
  ipcMain.handle('pdf:pdf-to-text', async (_e, args: { filePath: string; text: string }) => {
    try {
      const tempDir = os.tmpdir()
      const baseName = path.basename(args.filePath, '.pdf')
      const outputPath = path.join(tempDir, `${baseName}-extracted-${Date.now()}.txt`)
      fs.writeFileSync(outputPath, args.text, 'utf-8')
      return { success: true, outputPath }
    } catch (e: any) { return { success: false, error: e.message } }
  })

  // --- Translate Text ---
  ipcMain.handle('pdf:translate-text', async (_e, args: { text: string; targetLang: string }) => {
    try {
      const translatedText = await translateText(args.text, args.targetLang)
      return { success: true, translatedText }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // --- Save File (shared) ---
  ipcMain.handle('pdf:save-file', async (event, args: { tempPath: string, defaultName: string }) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { success: false, error: 'No window found' }

      const ext = path.extname(args.defaultName).toLowerCase()
      const filters: Electron.FileFilter[] = ext === '.zip'
        ? [{ name: 'ZIP Archive', extensions: ['zip'] }]
        : ext === '.docx' ? [{ name: 'Word Document', extensions: ['docx'] }]
        : ext === '.pptx' ? [{ name: 'PowerPoint Presentation', extensions: ['pptx'] }]
        : ext === '.xlsx' ? [{ name: 'Excel Spreadsheet', extensions: ['xlsx'] }]
        : ext === '.jpg' || ext === '.jpeg' ? [{ name: 'JPG Image', extensions: ['jpg', 'jpeg'] }]
        : [{ name: 'PDF Document', extensions: ['pdf'] }]

      const result = await dialog.showSaveDialog(win, {
        defaultPath: args.defaultName,
        filters
      })

      if (result.canceled || !result.filePath) return { success: true, canceled: true }

      fs.copyFileSync(args.tempPath, result.filePath)
      fs.unlinkSync(args.tempPath)
      return { success: true, savedPath: result.filePath }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('pdf:save-file-buffer', async (event, args: { buffer: Uint8Array, defaultName: string }) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { success: false, error: 'No window found' }

      const ext = path.extname(args.defaultName).toLowerCase()
      const filters: Electron.FileFilter[] = ext === '.pdf' 
        ? [{ name: 'PDF Document', extensions: ['pdf'] }]
        : []

      const result = await dialog.showSaveDialog(win, {
        defaultPath: args.defaultName,
        filters
      })

      if (result.canceled || !result.filePath) return { success: true, canceled: true }

      fs.writeFileSync(result.filePath, Buffer.from(args.buffer))
      return { success: true, savedPath: result.filePath }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('pdf:read-file', async (_e, args: { filePath: string }) => {
    try {
      const buffer = fs.readFileSync(args.filePath)
      return { success: true, data: buffer }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // --- Save Annotated PDF ---
  ipcMain.handle('pdf:save-annotated-pdf', async (event, args: SaveAnnotatedPdfOptions & { defaultName?: string }) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { success: false, error: 'No active window found' }

      const base = path.basename(args.originalPath, path.extname(args.originalPath))
      const defaultName = args.defaultName || `${base}-annotated.pdf`

      const saveResult = await dialog.showSaveDialog(win, {
        defaultPath: defaultName,
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
      })

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: true, canceled: true }
      }

      const savedPath = await saveAnnotatedPdf({
        originalPath: args.originalPath,
        annotations: args.annotations,
        outputPath: saveResult.filePath
      })

      return { success: true, savedPath }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // --- Open File Dialog ---
  ipcMain.handle('pdf:open-file-dialog', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
        filters: [{ name: 'PDF Documents (*.pdf)', extensions: ['pdf'] }]
      }
      const result = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options)

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: true, canceled: true }
      }

      const filePath = result.filePaths[0]
      const buffer = fs.readFileSync(filePath)
      return {
        success: true,
        filePath,
        name: path.basename(filePath),
        size: buffer.length,
        data: buffer
      }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  // --- Open External URL ---
  ipcMain.handle('pdf:open-external', async (_e, url: string) => {
    try {
      await shell.openExternal(url)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })
}

