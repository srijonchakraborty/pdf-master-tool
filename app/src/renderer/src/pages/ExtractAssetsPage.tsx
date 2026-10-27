import { useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { PackageOpen, X, FileText, CheckCircle2, Image, Type, Package } from 'lucide-react'

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function ExtractAssetsPage() {
  const [file, setFile] = useState<{ name: string; path: string; size: number } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [done, setDone] = useState(false)

  const handleFileSelect = (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    setFile({ name: f.name, path: window.api.getFilePath(f), size: f.size })
    setDone(false)
  }

  const handleExtract = async () => {
    if (!file) return
    setIsProcessing(true)
    try {
      const res = await window.api.extractAssets(file.path)
      if (!res.success || !res.outputPath) throw new Error(res.error || 'Extraction failed')

      const baseName = file.name.replace('.pdf', '')
      const saveRes = await window.api.saveFile(res.outputPath, `${baseName}_assets.zip`)
      setIsProcessing(false)

      if (saveRes.canceled) {
        toast.info('Save canceled.')
      } else if (saveRes.success) {
        toast.success('Assets extracted successfully!')
        setDone(true)
      } else {
        throw new Error(saveRes.error)
      }
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  const assetTypes = [
    { icon: Image, label: 'Images', desc: 'JPEG, PNG, JP2, TIFF embedded images', color: 'text-blue-400' },
    { icon: Type, label: 'Fonts', desc: 'Embedded font files from the PDF', color: 'text-purple-400' },
    { icon: Package, label: 'ZIP Output', desc: 'All assets organized in a clean archive', color: 'text-green-400' },
  ]

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <PackageOpen className="w-8 h-8 text-accent" /> Extract Assets from PDF
          </h1>
          <p className="text-muted">Easily extract images, fonts, and other embedded assets from your PDF documents into a downloadable ZIP.</p>
        </header>

        {/* Asset type grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {assetTypes.map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="bg-secondary border border-border rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Icon className={`w-6 h-6 ${color}`} />
                <span className="font-semibold text-foreground">{label}</span>
              </div>
              <p className="text-xs text-muted">{desc}</p>
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
              {!done && (
                <button onClick={() => { setFile(null); setDone(false) }} className="p-2 text-muted hover:text-danger transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {done ? (
              <div className="bg-elevated border border-accent/30 rounded-xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-green-500" />
                <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Extraction Complete!</h2>
                <p className="text-muted mb-6">All images and fonts have been extracted and saved in the ZIP archive.</p>
                <PrimaryButton variant="secondary" onClick={() => { setFile(null); setDone(false) }}>Extract from Another PDF</PrimaryButton>
              </div>
            ) : (
              <div className="bg-secondary border border-border rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-2">Ready to Extract</h3>
                <p className="text-sm text-muted mb-6">Assets will be organized in a ZIP file with separate folders for images and fonts.</p>
                <div className="bg-background border border-border rounded-lg p-4 mb-6">
                  <p className="text-xs text-muted">
                    <span className="text-accent font-medium">Note: </span>
                    Only images and fonts <em>embedded</em> in the PDF can be extracted. Images shown via URL references or external links cannot be extracted.
                  </p>
                </div>
                <div className="flex justify-end">
                  <PrimaryButton onClick={handleExtract} className="px-8">
                    <PackageOpen className="w-4 h-4 mr-2" />
                    Extract Assets
                  </PrimaryButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <ProgressModal isOpen={isProcessing} title="Extracting Assets" status="Scanning PDF streams for images and fonts..." />
    </div>
  )
}
