import { useState, useEffect } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { InstallBanner } from '../components/InstallBanner'
import { toast } from 'sonner'
import { Minimize2, X, FileText, CheckCircle2, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'

type CompressQuality = 'low' | 'medium' | 'high'

// Helper to format bytes
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function CompressPdfPage() {
  const [isGhostscriptInstalled, setIsGhostscriptInstalled] = useState<boolean | null>(null)
  const [file, setFile] = useState<{ name: string; path: string; size: number } | null>(null)
  const [quality, setQuality] = useState<CompressQuality>('medium')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ originalSize: number, newSize: number, savedPath?: string } | null>(null)

  useEffect(() => {
    // No-op for compatibility
  }, [])

  const handleFileSelect = (selectedFiles: FileList) => {
    if (selectedFiles.length === 0) return
    const selected = selectedFiles[0]
    if (selected.type !== 'application/pdf') {
      toast.error('Please select a PDF file.')
      return
    }

    setFile({
      name: selected.name,
      path: window.api.getFilePath(selected),
      size: selected.size
    })
    setResult(null)
  }

  const handleCompress = async () => {
    if (!file) return

    setIsProcessing(true)
    try {
      const res = await window.api.compressPdf({
        filePath: file.path,
        quality
      })

      if (!res.success) throw new Error(res.error)

      setIsProcessing(false)
      
      const saveRes = await window.api.saveFile(res.outputPath!, `${file.name.replace('.pdf', '')}_compressed.pdf`)
      
      if (saveRes.canceled) {
        toast.info('Save canceled.')
      } else if (saveRes.success) {
        toast.success(`Saved to ${saveRes.savedPath}`)
        setResult({
          originalSize: res.originalSize!,
          newSize: res.newSize!,
          savedPath: saveRes.savedPath
        })
      } else {
        throw new Error(saveRes.error)
      }
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  const clearFile = () => {
    setFile(null)
    setResult(null)
  }



  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Minimize2 className="w-8 h-8 text-accent" /> Compress PDF
          </h1>
          <p className="text-muted">Reduce file size while optimizing for maximum quality.</p>
        </header>

        {!file ? (
          <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between bg-secondary p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-background rounded-lg text-accent border border-border">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground truncate max-w-sm">{file.name}</h3>
                  <p className="text-sm text-muted">{formatBytes(file.size)}</p>
                </div>
              </div>
              {!result && (
                <button onClick={clearFile} className="p-2 text-muted hover:text-danger rounded-lg hover:bg-elevated transition-colors">
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
                <h2 className="text-2xl font-bold text-foreground mb-6">Compression Successful!</h2>
                
                <div className="flex items-center justify-center gap-6 max-w-md mx-auto mb-8">
                  <div className="flex-1 bg-background p-4 rounded-lg border border-border">
                    <p className="text-sm text-muted mb-1">Original Size</p>
                    <p className="text-xl font-semibold text-foreground">{formatBytes(result.originalSize)}</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-muted shrink-0" />
                  <div className="flex-1 bg-accent/10 p-4 rounded-lg border border-accent/20">
                    <p className="text-sm text-accent mb-1">New Size</p>
                    <p className="text-xl font-bold text-accent">{formatBytes(result.newSize)}</p>
                  </div>
                </div>

                {result.originalSize > result.newSize && (
                  <div className="inline-block bg-accent text-white px-4 py-2 rounded-full font-medium mb-8">
                    You saved {((1 - (result.newSize / result.originalSize)) * 100).toFixed(1)}%
                  </div>
                )}
                
                {result.originalSize <= result.newSize && (
                  <p className="text-muted mb-8 max-w-sm mx-auto">
                    This file was already highly optimized. We couldn't reduce the size further without severe quality loss.
                  </p>
                )}

                <div>
                  <PrimaryButton variant="secondary" onClick={clearFile}>Compress Another File</PrimaryButton>
                </div>
              </div>
            ) : (
              <div className="bg-elevated rounded-xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Select Compression Quality</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setQuality('low')}
                    className={cn(
                      "flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all",
                      quality === 'low' ? "border-accent bg-accent/5" : "border-border hover:border-accent/50 bg-background"
                    )}
                  >
                    <div className="font-semibold text-foreground mb-1">Extreme Compression</div>
                    <div className="text-sm text-muted mb-3">Smallest size, lowest quality</div>
                    <div className="mt-auto pt-4 w-full">
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div className="bg-accent h-full w-[20%]" />
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setQuality('medium')}
                    className={cn(
                      "flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all",
                      quality === 'medium' ? "border-accent bg-accent/5" : "border-border hover:border-accent/50 bg-background"
                    )}
                  >
                    <div className="font-semibold text-foreground mb-1">Recommended</div>
                    <div className="text-sm text-muted mb-3">Good quality, reduced size</div>
                    <div className="mt-auto pt-4 w-full">
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div className="bg-accent h-full w-[50%]" />
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setQuality('high')}
                    className={cn(
                      "flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all",
                      quality === 'high' ? "border-accent bg-accent/5" : "border-border hover:border-accent/50 bg-background"
                    )}
                  >
                    <div className="font-semibold text-foreground mb-1">High Quality</div>
                    <div className="text-sm text-muted mb-3">Best quality, minimal compression</div>
                    <div className="mt-auto pt-4 w-full">
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div className="bg-accent h-full w-[80%]" />
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t border-border flex justify-end">
                  <PrimaryButton onClick={handleCompress} className="px-8">
                    Compress PDF
                  </PrimaryButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ProgressModal 
        isOpen={isProcessing} 
        title="Compressing PDF" 
        status="This may take a minute for large files..." 
      />
    </div>
  )
}
