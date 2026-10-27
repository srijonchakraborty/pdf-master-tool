import { useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { FileText, X, Eye, EyeOff } from 'lucide-react'

export function UnlockPdfPage() {
  const [file, setFile] = useState<{ name: string; path: string } | null>(null)
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const handleFileSelect = (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    setFile({ name: f.name, path: window.api.getFilePath(f) })
    setPassword('')
    setError('')
  }

  const handleUnlock = async () => {
    if (!file || !password) return
    setError('')
    setIsProcessing(true)
    try {
      const res = await window.api.unlockPdf(file.path, password)
      if (!res.success) {
        if (res.error === 'WRONG_PASSWORD') throw new Error('Incorrect password. Please try again.')
        throw new Error(res.error)
      }
      setIsProcessing(false)
      const saveRes = await window.api.saveFile(res.outputPath!, `${file.name.replace('.pdf', '')}_unlocked.pdf`)
      if (saveRes.canceled) toast.info('Save canceled.')
      else if (saveRes.success) { toast.success('PDF unlocked and saved!'); setFile(null); setPassword('') }
      else throw new Error(saveRes.error)
    } catch (err: any) {
      setIsProcessing(false)
      setError(err.message)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2">Unlock PDF</h1>
          <p className="text-muted">Remove password protection from a PDF (requires the current password).</p>
        </header>

        {!file ? (
          <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-secondary p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-accent" />
                <span className="font-medium truncate max-w-sm">{file.name}</span>
              </div>
              <button onClick={() => setFile(null)} className="p-2 text-muted hover:text-danger"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-secondary border border-border rounded-xl p-6 space-y-4">
              <label className="block text-sm font-medium text-foreground">PDF Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter current password"
                  onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-sm text-danger font-medium">{error}</p>}
              <PrimaryButton onClick={handleUnlock} disabled={!password} className="w-full">
                Unlock PDF
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
      <ProgressModal isOpen={isProcessing} title="Unlocking PDF" status="Removing password protection..." />
    </div>
  )
}
