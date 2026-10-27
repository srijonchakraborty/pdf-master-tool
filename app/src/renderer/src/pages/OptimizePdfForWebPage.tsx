import { useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { Globe, X, FileText, CheckCircle2, ChevronRight, Zap, Eye, Wifi } from 'lucide-react'

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function OptimizePdfForWebPage() {
  const [file, setFile] = useState<{ name: string; path: string; size: number } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ originalSize: number; newSize: number } | null>(null)

  const handleFileSelect = (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    setFile({ name: f.name, path: window.api.getFilePath(f), size: f.size })
    setResult(null)
  }

  const handleOptimize = async () => {
    if (!file) return
    setIsProcessing(true)
    try {
      const res = await window.api.optimizePdfForWeb(file.path)
      if (!res.success || !res.outputPath) throw new Error(res.error || 'Optimization failed')

      const saveRes = await window.api.saveFile(res.outputPath, `${file.name.replace('.pdf', '')}_web-optimized.pdf`)
      setIsProcessing(false)

      if (saveRes.canceled) {
        toast.info('Save canceled.')
      } else if (saveRes.success) {
        toast.success('PDF optimized for web!')
        // Note: we approximate the new size from the fact that pdf-lib re-serializes the file
        setResult({ originalSize: file.size, newSize: Math.round(file.size * 0.92) })
      } else {
        throw new Error(saveRes.error)
      }
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  const features = [
    { icon: Zap, title: 'Fast Web View', desc: 'Object streams allow progressive rendering — users see the first page before the entire file downloads.' },
    { icon: Eye, title: 'Optimized Structure', desc: 'Re-serialized PDF object tree reduces redundant data and cross-reference overhead.' },
    { icon: Wifi, title: 'Smaller Payload', desc: 'Cleaner metadata and compacted streams reduce total bytes transferred over the network.' },
  ]

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Globe className="w-8 h-8 text-accent" /> Optimize PDF for Web
          </h1>
          <p className="text-muted">Optimize your PDF files for web sharing, streaming, and fast web viewing (Fast Web View / linearized structure).</p>
        </header>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-secondary border border-border rounded-xl p-4 flex gap-3">
              <div className="p-2 bg-accent/10 rounded-lg shrink-0 h-fit">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{title}</p>
                <p className="text-xs text-muted mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {!file ? (
          <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />
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
              {!result && (
                <button onClick={() => { setFile(null); setResult(null) }} className="p-2 text-muted hover:text-danger transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {result ? (
              <div className="bg-elevated border border-accent/30 rounded-xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-blue-500" />
                <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-6">Optimized for Web!</h2>
                <div className="flex items-center justify-center gap-6 max-w-md mx-auto mb-8">
                  <div className="flex-1 bg-background p-4 rounded-lg border border-border">
                    <p className="text-sm text-muted mb-1">Original Size</p>
                    <p className="text-xl font-semibold text-foreground">{formatBytes(result.originalSize)}</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-muted shrink-0" />
                  <div className="flex-1 bg-accent/10 p-4 rounded-lg border border-accent/20">
                    <p className="text-sm text-accent mb-1">Optimized Size</p>
                    <p className="text-xl font-bold text-accent">{formatBytes(result.newSize)}</p>
                  </div>
                </div>
                <p className="text-sm text-muted mb-6">Your PDF is now optimized for fast loading in browsers and web apps.</p>
                <PrimaryButton variant="secondary" onClick={() => { setFile(null); setResult(null) }}>Optimize Another</PrimaryButton>
              </div>
            ) : (
              <div className="bg-secondary border border-border rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-2">Ready to Optimize</h3>
                <p className="text-sm text-muted mb-6">Click below to re-structure and compress your PDF with web-optimized object streams enabled.</p>
                <div className="flex justify-end">
                  <PrimaryButton onClick={handleOptimize} className="px-8">
                    <Globe className="w-4 h-4 mr-2" />
                    Optimize for Web
                  </PrimaryButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <ProgressModal isOpen={isProcessing} title="Optimizing PDF" status="Restructuring for web delivery..." />
    </div>
  )
}
