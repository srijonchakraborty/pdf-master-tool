import { useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { BookOpen, X, FileText, CheckCircle2, BookMarked, Smartphone } from 'lucide-react'

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function EpubToPdfPage() {
  const [file, setFile] = useState<{ name: string; path: string; size: number } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [done, setDone] = useState(false)

  const handleFileSelect = (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    setFile({ name: f.name, path: window.api.getFilePath(f), size: f.size })
    setDone(false)
  }

  const handleConvert = async () => {
    if (!file) return
    setIsProcessing(true)
    try {
      const res = await window.api.epubToPdf(file.path)
      if (!res.success || !res.outputPath) throw new Error(res.error || 'Conversion failed')

      const baseName = file.name.replace(/\.[^/.]+$/, '')
      const saveRes = await window.api.saveFile(res.outputPath, `${baseName}.pdf`)
      setIsProcessing(false)

      if (saveRes.canceled) {
        toast.info('Save canceled.')
      } else if (saveRes.success) {
        toast.success('eBook converted to PDF!')
        setDone(true)
      } else {
        throw new Error(saveRes.error)
      }
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  const formats = [
    { icon: BookOpen, label: 'EPUB', desc: '.epub files — standard ebook format used by most readers', badge: 'Full Support' },
    { icon: Smartphone, label: 'MOBI / AZW', desc: '.mobi, .azw — Kindle ebook formats (text extraction)', badge: 'Beta' },
    { icon: BookMarked, label: 'EPUB3', desc: 'Modern EPUB3 with spine ordering', badge: 'Full Support' },
  ]

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-accent" /> EPUB to PDF
          </h1>
          <p className="text-muted">Convert your eBook files (EPUB, MOBI) into PDF documents — offline, fast, and completely free.</p>
        </header>

        {/* Supported Formats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {formats.map(({ icon: Icon, label, desc, badge }) => (
            <div key={label} className="bg-secondary border border-border rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-accent" />
                  <span className="font-semibold text-foreground">{label}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge === 'Beta' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-accent/20 text-accent'}`}>
                  {badge}
                </span>
              </div>
              <p className="text-xs text-muted">{desc}</p>
            </div>
          ))}
        </div>

        {!file ? (
          <Dropzone onFileSelect={handleFileSelect} accept=".epub,.mobi,.azw,.azw3" multiple={false} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-secondary p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-background rounded-lg text-accent border border-border">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground truncate max-w-sm">{file.name}</p>
                  <p className="text-sm text-muted">{formatBytes(file.size)}</p>
                </div>
              </div>
              {!done && (
                <button onClick={() => { setFile(null); setDone(false) }} className="p-2 text-muted hover:text-danger transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {done ? (
              <div className="bg-elevated border border-accent/30 rounded-xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-purple-500" />
                <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Conversion Successful!</h2>
                <p className="text-muted mb-6">Your eBook has been converted to PDF and saved.</p>
                <PrimaryButton variant="secondary" onClick={() => { setFile(null); setDone(false) }}>Convert Another eBook</PrimaryButton>
              </div>
            ) : (
              <div className="bg-secondary border border-border rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-2">Ready to Convert</h3>
                <p className="text-sm text-muted mb-4">The eBook content will be parsed and laid out into a standard A4 PDF document with proper title page and formatted text.</p>
                <div className="bg-background border border-border rounded-lg p-4 mb-6">
                  <p className="text-xs text-muted">
                    <span className="text-accent font-medium">How it works: </span>
                    EPUB files are unpacked, chapters are ordered using the spine manifest, and text is typeset into a clean PDF. Images embedded in EPUBs are not currently included.
                  </p>
                </div>
                <div className="flex justify-end">
                  <PrimaryButton onClick={handleConvert} className="px-8">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Convert to PDF
                  </PrimaryButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <ProgressModal isOpen={isProcessing} title="Converting eBook" status="Parsing chapters and building PDF..." />
    </div>
  )
}
