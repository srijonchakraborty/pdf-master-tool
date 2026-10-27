import { useState, useMemo } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { FileCode, FileText, X, Eye, Edit3, Sparkles } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { cn } from '../lib/utils'
import { PageThumbnailGrid, PdfPageInfo } from '../components/PageThumbnailGrid'
import { marked } from 'marked'

const SAMPLE_MARKDOWN = `# Project Documentation
## Overview
Welcome to the **PDF Master Toolkit** Markdown export documentation. This document illustrates headers, styling, tables, code blocks, and task lists.

> "Simplicity is the soul of efficiency." — Austin Freeman

### Key Features
- [x] High quality vector PDF generation
- [x] Syntax-highlighted code blocks
- [x] GitHub-flavored Markdown tables and task lists
- [ ] Direct cloud export

### Supported Code Languages
Here is an example TypeScript function:

\`\`\`typescript
interface UserProfile {
  id: string;
  name: string;
  roles: string[];
}

export function formatGreeting(user: UserProfile): string {
  return \`Welcome back, \${user.name}!\`;
}
\`\`\`

### Data Matrix Table
| Feature | Supported | Offline Ready |
| :--- | :---: | :---: |
| HTML to PDF | Yes | Yes |
| Markdown to PDF | Yes | Yes |
| PDF Forms | Yes | Yes |
| OCR Scanner | Yes | Yes |

---
*Generated automatically by PDF Master Toolkit.*
`

export function MdToPdfPage() {
  const [inputMode, setInputMode] = useState<'upload' | 'write'>('upload')
  const [selectedFile, setSelectedFile] = useState<{ name: string; path: string; size: number } | null>(null)
  const [markdownText, setMarkdownText] = useState('')
  const [previewTab, setPreviewTab] = useState<'editor' | 'rendered'>('editor')

  // Settings
  const [theme, setTheme] = useState<'github' | 'modern' | 'academic' | 'minimal'>('github')
  const [pageSize, setPageSize] = useState('A4')
  const [landscape, setLandscape] = useState(false)
  const [marginType, setMarginType] = useState<'default' | 'none' | 'minimum'>('default')
  const [scaling, setScaling] = useState<'auto' | '100' | '90' | '80' | '75' | '60'>('auto')

  // Processing & preview state
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewPdfPath, setPreviewPdfPath] = useState<string | null>(null)
  const [pdfPages, setPdfPages] = useState<PdfPageInfo[]>([])

  const isValid = markdownText.trim().length > 0 || (inputMode === 'upload' && selectedFile !== null)

  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    const filePath = window.api.getFilePath(f)
    setSelectedFile({ name: f.name, path: filePath, size: f.size })

    try {
      const readRes = await window.api.readFile(filePath)
      if (readRes.success && readRes.data) {
        const text = new TextDecoder('utf-8').decode(readRes.data)
        setMarkdownText(text)
      }
    } catch (e: any) {
      toast.error(`Failed to read file content: ${e.message}`)
    }
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    setMarkdownText('')
  }

  const renderedHtml = useMemo(() => {
    try {
      return marked.parse(markdownText || '*No markdown text provided yet.*') as string
    } catch {
      return '<p>Error parsing markdown preview.</p>'
    }
  }, [markdownText])

  const handleConvert = async () => {
    if (!isValid) return
    setIsProcessing(true)
    try {
      const baseTitle = selectedFile
        ? selectedFile.name.replace(/\.[^/.]+$/, '')
        : 'Markdown_Document'

      const res = await window.api.mdToPdf({
        source:
          inputMode === 'upload' && selectedFile
            ? { type: 'file', filePath: selectedFile.path }
            : { type: 'markdown', markdown: markdownText },
        theme,
        pageSize,
        landscape,
        marginType,
        scale: scaling === 'auto' ? undefined : Number(scaling) / 100,
        autoFit: scaling === 'auto',
        title: baseTitle
      })

      if (!res.success || !res.outputPath) throw new Error(res.error || 'Conversion failed')

      // Load generated PDF for thumbnail preview
      const readRes = await window.api.readFile(res.outputPath)
      if (!readRes.success || !readRes.data) throw new Error('Failed to load generated PDF')

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(readRes.data) })
      const pdf = await loadingTask.promise
      const pages: PdfPageInfo[] = []

      for (let i = 1; i <= pdf.numPages; i++) {
        pages.push({ id: `page-${i}`, pageNumber: i, pdfDocument: pdf })
      }

      setPdfPages(pages)
      setPreviewPdfPath(res.outputPath)
      setIsProcessing(false)
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  const handleExport = async () => {
    if (!previewPdfPath) return
    try {
      const baseName = selectedFile
        ? selectedFile.name.replace(/\.[^/.]+$/, '')
        : 'markdown-document'
      const defaultName = `${baseName}.pdf`
      const saveRes = await window.api.saveFile(previewPdfPath, defaultName)

      if (saveRes.canceled) {
        toast.info('Save canceled.')
      } else if (saveRes.success) {
        toast.success('PDF saved successfully!')
        setPreviewPdfPath(null)
        setPdfPages([])
      } else {
        throw new Error(saveRes.error)
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <FileCode className="w-8 h-8 text-accent" /> Markdown to PDF
          </h1>
          <p className="text-muted">
            Transform Markdown files or raw text into beautifully styled, print-perfect PDF documents.
          </p>
        </header>

        {/* Input Mode Selector */}
        <div className="bg-secondary border border-border rounded-xl p-6 space-y-6">
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode('upload')}
              className={cn(
                'flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2',
                inputMode === 'upload'
                  ? 'border-accent bg-accent/10 text-accent font-semibold'
                  : 'border-border hover:border-accent/50 text-foreground'
              )}
            >
              <FileText className="w-4 h-4" />
              Upload Markdown File
            </button>
            <button
              onClick={() => setInputMode('write')}
              className={cn(
                'flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2',
                inputMode === 'write'
                  ? 'border-accent bg-accent/10 text-accent font-semibold'
                  : 'border-border hover:border-accent/50 text-foreground'
              )}
            >
              <Edit3 className="w-4 h-4" />
              Write / Paste Markdown
            </button>
          </div>

          {inputMode === 'upload' && (
            <div>
              {!selectedFile ? (
                <Dropzone
                  onFileSelect={handleFileSelect}
                  accept=".md,.markdown,.mdown,.mkd,.txt"
                  multiple={false}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-background p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-secondary rounded-lg text-accent border border-border">
                        <FileCode className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground truncate max-w-md">{selectedFile.name}</p>
                        <p className="text-xs text-muted">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Loaded into editor
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleClearFile}
                      className="p-2 text-muted hover:text-danger transition-colors rounded-lg hover:bg-secondary"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Editor and Preview Box */}
          {(inputMode === 'write' || selectedFile) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewTab('editor')}
                    className={cn(
                      'px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5',
                      previewTab === 'editor'
                        ? 'bg-elevated text-foreground border border-border'
                        : 'text-muted hover:text-foreground'
                    )}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Source
                  </button>
                  <button
                    onClick={() => setPreviewTab('rendered')}
                    className={cn(
                      'px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5',
                      previewTab === 'rendered'
                        ? 'bg-elevated text-foreground border border-border'
                        : 'text-muted hover:text-foreground'
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" /> HTML Preview
                  </button>
                </div>

                {!selectedFile && (
                  <button
                    onClick={() => setMarkdownText(SAMPLE_MARKDOWN)}
                    className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Load Sample
                  </button>
                )}
              </div>

              {previewTab === 'editor' ? (
                <textarea
                  value={markdownText}
                  onChange={(e) => setMarkdownText(e.target.value)}
                  placeholder="# Enter your markdown text here..."
                  rows={9}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent font-mono resize-y"
                />
              ) : (
                <div
                  className="w-full max-h-[300px] overflow-y-auto bg-background border border-border rounded-lg p-5 prose prose-invert max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              )}
            </div>
          )}

          {/* Document Settings */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-border">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              >
                <option value="github">GitHub</option>
                <option value="modern">Modern Clean</option>
                <option value="academic">Academic</option>
                <option value="minimal">Minimalist</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Page Size</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              >
                {['A4', 'Letter', 'A3', 'Legal', 'Tabloid'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Margins</label>
              <select
                value={marginType}
                onChange={(e) => setMarginType(e.target.value as any)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              >
                <option value="default">Default</option>
                <option value="minimum">Minimum</option>
                <option value="none">None (0px)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Scaling / Fit</label>
              <select
                value={scaling}
                onChange={(e) => setScaling(e.target.value as any)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              >
                <option value="auto">Auto-Fit (Anti-Crop)</option>
                <option value="100">100%</option>
                <option value="90">90%</option>
                <option value="80">80%</option>
                <option value="75">75%</option>
                <option value="60">60%</option>
              </select>
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={landscape}
                  onChange={(e) => setLandscape(e.target.checked)}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-sm font-medium">Landscape</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <PrimaryButton onClick={handleConvert} disabled={!isValid} className="px-8">
              <FileCode className="w-4 h-4 mr-2" />
              Convert to PDF
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/* PDF Thumbnail Preview Modal */}
      {previewPdfPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-8">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <FileCode className="w-5 h-5 text-accent" />
                Preview Generated PDF
              </h2>
              <button
                onClick={() => {
                  setPreviewPdfPath(null)
                  setPdfPages([])
                }}
                className="p-2 text-muted hover:text-foreground transition-colors rounded hover:bg-elevated"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-secondary/10">
              {pdfPages.length > 0 ? (
                <div className="bg-background rounded-lg border border-border p-4 shadow-sm">
                  <PageThumbnailGrid pages={pdfPages} selectedIds={[]} onToggleSelect={() => {}} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted">Loading preview...</div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-secondary/50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setPreviewPdfPath(null)
                  setPdfPages([])
                }}
                className="px-4 py-2 rounded font-medium text-sm border border-border hover:bg-elevated transition-colors"
              >
                Cancel
              </button>
              <PrimaryButton onClick={handleExport} className="px-6">
                Export PDF
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <ProgressModal
        isOpen={isProcessing}
        title="Converting Markdown to PDF"
        status="Rendering styles and building PDF..."
      />
    </div>
  )
}
