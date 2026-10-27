import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Checks
  checkGhostscript: () => ipcRenderer.invoke('pdf:check-ghostscript'),
  checkQpdf: () => ipcRenderer.invoke('pdf:check-qpdf'),
  checkLibreOffice: () => ipcRenderer.invoke('pdf:check-libreoffice'),

  // Core PDF ops
  mergePdf: (filePaths: string[]) => ipcRenderer.invoke('pdf:merge-pdf', { filePaths }),
  splitPdf: (options: any) => ipcRenderer.invoke('pdf:split-pdf', options),
  compressPdf: (options: any) => ipcRenderer.invoke('pdf:compress-pdf', options),
  rotatePdf: (filePath: string, rotations: any[]) => ipcRenderer.invoke('pdf:rotate-pdf', { filePath, rotations }),
  watermarkPdf: (options: any) => ipcRenderer.invoke('pdf:watermark-pdf', options),
  addPageNumbers: (options: any) => ipcRenderer.invoke('pdf:add-page-numbers', options),
  organizePdf: (filePath: string, pageOrder: number[]) => ipcRenderer.invoke('pdf:organize-pdf', { filePath, pageOrder }),
  mergeOrganizePdf: (options: any) => ipcRenderer.invoke('pdf:merge-organize-pdf', options),
  jpgToPdf: (filePaths: string[], pageSize: string) => ipcRenderer.invoke('pdf:jpg-to-pdf', { filePaths, pageSize }),
  pdfToJpg: (filePath: string, dpi: number, quality: number) => ipcRenderer.invoke('pdf:pdf-to-jpg', { filePath, dpi, quality }),

  // Security
  unlockPdf: (filePath: string, password: string) => ipcRenderer.invoke('pdf:unlock-pdf', { filePath, password }),
  protectPdf: (options: any) => ipcRenderer.invoke('pdf:protect-pdf', options),

  // Optimize & Recover
  repairPdf: (filePath: string) => ipcRenderer.invoke('pdf:repair-pdf', { filePath }),
  pdfToPdfa: (filePath: string) => ipcRenderer.invoke('pdf:pdf-to-pdfa', { filePath }),

  // LibreOffice conversions
  pdfToWord: (filePath: string) => ipcRenderer.invoke('pdf:pdf-to-word', { filePath }),
  pdfToPowerpoint: (filePath: string) => ipcRenderer.invoke('pdf:pdf-to-powerpoint', { filePath }),
  pdfToExcel: (filePath: string) => ipcRenderer.invoke('pdf:pdf-to-excel', { filePath }),
  wordToPdf: (filePath: string) => ipcRenderer.invoke('pdf:word-to-pdf', { filePath }),
  powerpointToPdf: (filePath: string) => ipcRenderer.invoke('pdf:powerpoint-to-pdf', { filePath }),
  excelToPdf: (filePath: string) => ipcRenderer.invoke('pdf:excel-to-pdf', { filePath }),

  cropPdf: (options: any) => ipcRenderer.invoke('pdf:crop-pdf', options),
  htmlToPdf: (options: any) => ipcRenderer.invoke('pdf:html-to-pdf', options),
  mdToPdf: (options: any) => ipcRenderer.invoke('pdf:md-to-pdf', options),
  optimizePdfForWeb: (filePath: string) => ipcRenderer.invoke('pdf:optimize-for-web', { filePath }),
  extractAssets: (filePath: string) => ipcRenderer.invoke('pdf:extract-assets', { filePath }),
  epubToPdf: (filePath: string) => ipcRenderer.invoke('pdf:epub-to-pdf', { filePath }),

  // Phase 4
  signPdf: (options: any) => ipcRenderer.invoke('pdf:sign-pdf', options),
  redactPdf: (filePath: string, redactions: any[]) => ipcRenderer.invoke('pdf:redact-pdf', { filePath, redactions }),
  detectFormFields: (filePath: string) => ipcRenderer.invoke('pdf:detect-form-fields', { filePath }),
  fillForm: (options: any) => ipcRenderer.invoke('pdf:fill-form', options),
  recognizeImageText: (dataUrl: string, language: string) => ipcRenderer.invoke('pdf:recognize-image-text', { dataUrl, language }),
  recognizeImageBoxes: (dataUrl: string, language: string) => ipcRenderer.invoke('pdf:recognize-image-boxes', { dataUrl, language }),
  translateText: (text: string, targetLang: string) => ipcRenderer.invoke('pdf:translate-text', { text, targetLang }),
  spellcheckText: (text: string, language: string) => ipcRenderer.invoke('pdf:spellcheck-text', { text, language }),
  buildCorrectedPdf: (originalPath: string, correctedText: string) => ipcRenderer.invoke('pdf:build-corrected-pdf', { originalPath, correctedText }),
  pdfToText: (filePath: string, text: string) => ipcRenderer.invoke('pdf:pdf-to-text', { filePath, text }),

  // Shared file save dialog
  saveFile: (tempPath: string, defaultName: string) => ipcRenderer.invoke('pdf:save-file', { tempPath, defaultName }),
  saveFileFromBuffer: (buffer: Uint8Array, defaultName: string) => ipcRenderer.invoke('pdf:save-file-buffer', { buffer, defaultName }),
  readFile: (filePath: string) => ipcRenderer.invoke('pdf:read-file', { filePath }),
  saveAnnotatedPdf: (options: any) => ipcRenderer.invoke('pdf:save-annotated-pdf', options),
  openFileDialog: () => ipcRenderer.invoke('pdf:open-file-dialog'),
  openExternal: (url: string) => ipcRenderer.invoke('pdf:open-external', url),

  // File Path util
  getFilePath: (file: any) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        const p = webUtils.getPathForFile(file)
        if (p) return p
      }
    } catch(e) {}
    return file.path
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
