import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      checkGhostscript: () => Promise<boolean>
      checkQpdf: () => Promise<boolean>
      checkLibreOffice: () => Promise<boolean>
      mergePdf: (filePaths: string[]) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      splitPdf: (options: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      compressPdf: (options: any) => Promise<{ success: boolean; outputPath?: string; originalSize?: number; newSize?: number; error?: string }>
      rotatePdf: (filePath: string, rotations: any[]) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      watermarkPdf: (options: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      addPageNumbers: (options: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      organizePdf: (filePath: string, pageOrder: number[]) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      mergeOrganizePdf: (options: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      jpgToPdf: (filePaths: string[], pageSize: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      pdfToJpg: (filePath: string, dpi: number, quality: number) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      unlockPdf: (filePath: string, password: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      protectPdf: (options: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      repairPdf: (filePath: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      pdfToPdfa: (filePath: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      pdfToWord: (filePath: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      pdfToPowerpoint: (filePath: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      pdfToExcel: (filePath: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      wordToPdf: (filePath: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      powerpointToPdf: (filePath: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      excelToPdf: (filePath: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      cropPdf: (options: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      htmlToPdf: (options: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      mdToPdf: (options: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      signPdf: (options: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      redactPdf: (filePath: string, redactions: any[]) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      detectFormFields: (filePath: string) => Promise<{ success: boolean; fields?: any[]; error?: string }>
      fillForm: (options: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      recognizeImageText: (dataUrl: string, language: string) => Promise<{ success: boolean; text?: string; error?: string }>
      recognizeImageBoxes: (dataUrl: string, language: string) => Promise<{ success: boolean; words?: any[]; width?: number; height?: number; error?: string }>
      optimizePdfForWeb: (filePath: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      extractAssets: (filePath: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      epubToPdf: (filePath: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      saveFile: (tempPath: string, defaultName: string) => Promise<{ success: boolean; savedPath?: string; error?: string; canceled?: boolean }>
      saveFileFromBuffer: (buffer: Uint8Array, defaultName: string) => Promise<{ success: boolean; savedPath?: string; error?: string; canceled?: boolean }>
      readFile: (filePath: string) => Promise<{ success: boolean; data?: Uint8Array; error?: string }>
      saveAnnotatedPdf: (options: { originalPath: string; annotations: any[]; defaultName?: string }) => Promise<{ success: boolean; savedPath?: string; error?: string; canceled?: boolean }>
      openFileDialog: () => Promise<{ success: boolean; filePath?: string; name?: string; size?: number; data?: Uint8Array; canceled?: boolean; error?: string }>
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>
      translateText: (text: string, targetLang: string) => Promise<{ success: boolean; translatedText?: string; error?: string }>
      spellcheckText: (text: string, language: string) => Promise<{ success: boolean; correctedText?: string; matches?: any[]; changeCount?: number; error?: string }>
      buildCorrectedPdf: (originalPath: string, correctedText: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      pdfToText: (filePath: string, text: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      getFilePath: (file: any) => string
    }
  }
}
