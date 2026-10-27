export interface ToolDef {
  id: string
  name: string
  description: string
  category: 'Organize' | 'Convert' | 'Edit' | 'Security' | 'Optimize & Recover'
  iconName: string // maps to a lucide-react icon
}

export const TOOLS: ToolDef[] = [
  // Organize
  { id: 'pdf-reader', name: 'PDF Reader & Viewer', description: 'View, navigate, highlight, and annotate PDFs like Adobe Acrobat Reader', category: 'Organize', iconName: 'BookOpen' },
  { id: 'merge-organize-pdf', name: 'Merge & Organize', description: 'Combine multiple PDFs, rearrange, delete and rotate pages', category: 'Organize', iconName: 'Layers' },
  { id: 'split-pdf', name: 'Split PDF', description: 'Extract pages or split by range', category: 'Organize', iconName: 'Scissors' },
  { id: 'rotate-pdf', name: 'Rotate PDF', description: 'Rotate pages within a PDF', category: 'Organize', iconName: 'RotateCw' },
  { id: 'crop-pdf', name: 'Crop PDF', description: 'Trim PDF margins or select area', category: 'Organize', iconName: 'Crop' },
  // Convert
  { id: 'pdf-to-word', name: 'PDF to Word', description: 'Convert PDF to editable Word', category: 'Convert', iconName: 'FileText' },
  { id: 'word-to-pdf', name: 'Word to PDF', description: 'Convert Word document to PDF', category: 'Convert', iconName: 'FileText' },
  { id: 'pdf-to-powerpoint', name: 'PDF to PowerPoint', description: 'Convert PDF to PPT', category: 'Convert', iconName: 'Presentation' },
  { id: 'powerpoint-to-pdf', name: 'PowerPoint to PDF', description: 'Convert PPT to PDF', category: 'Convert', iconName: 'Presentation' },
  { id: 'pdf-to-excel', name: 'PDF to Excel', description: 'Extract tables to Excel', category: 'Convert', iconName: 'Table' },
  { id: 'excel-to-pdf', name: 'Excel to PDF', description: 'Convert Excel to PDF', category: 'Convert', iconName: 'Table' },
  { id: 'pdf-to-jpg', name: 'PDF to JPG', description: 'Extract images from PDF', category: 'Convert', iconName: 'Image' },
  { id: 'jpg-to-pdf', name: 'JPG to PDF', description: 'Convert images to a single PDF', category: 'Convert', iconName: 'Image' },
  { id: 'html-to-pdf', name: 'HTML to PDF', description: 'Convert webpage to PDF', category: 'Convert', iconName: 'Globe' },
  { id: 'md-to-pdf', name: 'Markdown to PDF', description: 'Convert Markdown (.md) to styled PDF', category: 'Convert', iconName: 'FileCode' },
  { id: 'pdf-to-pdfa', name: 'PDF to PDF/A', description: 'Convert to PDF/A for archiving', category: 'Convert', iconName: 'Archive' },
  { id: 'epub-to-pdf', name: 'EPUB to PDF', description: 'Convert eBooks (EPUB, MOBI) to PDF', category: 'Convert', iconName: 'BookOpen' },
  { id: 'extract-assets', name: 'Extract Assets', description: 'Extract images & fonts from PDF', category: 'Convert', iconName: 'PackageOpen' },
  { id: 'pdf-to-text', name: 'PDF to Text', description: 'Extract all text content from PDF', category: 'Convert', iconName: 'FileOutput' },
  // Edit
  { id: 'edit-pdf', name: 'Edit PDF', description: 'Add text, images, and annotations', category: 'Edit', iconName: 'Edit3' },
  { id: 'watermark-pdf', name: 'Watermark', description: 'Add a text or image watermark', category: 'Edit', iconName: 'Droplet' },
  { id: 'add-page-numbers', name: 'Page Numbers', description: 'Insert page numbers', category: 'Edit', iconName: 'ListOrdered' },
  { id: 'pdf-forms', name: 'PDF Forms', description: 'Fill and sign PDF forms', category: 'Edit', iconName: 'FormInput' },
  { id: 'redact-pdf', name: 'Redact PDF', description: 'Permanently remove sensitive text', category: 'Edit', iconName: 'Eraser' },
  // Security
  { id: 'protect-pdf', name: 'Protect PDF', description: 'Encrypt with password', category: 'Security', iconName: 'Lock' },
  { id: 'unlock-pdf', name: 'Unlock PDF', description: 'Remove password protection', category: 'Security', iconName: 'Unlock' },
  { id: 'sign-pdf', name: 'Sign PDF', description: 'Add a digital signature', category: 'Security', iconName: 'PenTool' },
  { id: 'compare-pdf', name: 'Compare PDF', description: 'Find differences between two PDFs', category: 'Security', iconName: 'Diff' },
  // Optimize & Recover
  { id: 'compress-pdf', name: 'Compress PDF', description: 'Reduce file size without quality loss', category: 'Optimize & Recover', iconName: 'Minimize2' },
  { id: 'optimize-pdf-for-web', name: 'Optimize for Web', description: 'Fast web view & streaming-ready PDF', category: 'Optimize & Recover', iconName: 'Globe' },
  { id: 'spellcheck-pdf', name: 'Spellcheck PDF', description: 'Check & correct spelling with AI', category: 'Optimize & Recover', iconName: 'SpellCheck' },
  { id: 'repair-pdf', name: 'Repair PDF', description: 'Fix a corrupted PDF file', category: 'Optimize & Recover', iconName: 'Wrench' },
  { id: 'ocr-pdf', name: 'OCR PDF', description: 'Make scanned text searchable', category: 'Optimize & Recover', iconName: 'ScanText' },
  { id: 'scan-to-pdf', name: 'Scan to PDF', description: 'Create a PDF from a scanner', category: 'Optimize & Recover', iconName: 'Scanner' },
  { id: 'translate-pdf', name: 'Translate PDF', description: 'Translate document text', category: 'Optimize & Recover', iconName: 'Languages' },
]
