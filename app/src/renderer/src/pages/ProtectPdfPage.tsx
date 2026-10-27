import { useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { FileText, X, Eye, EyeOff } from 'lucide-react'
import { cn } from '../lib/utils'

export function ProtectPdfPage() {
  const [file, setFile] = useState<{ name: string; path: string } | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [permissions, setPermissions] = useState({ printing: true, copying: true, modifying: true })
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileSelect = (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    setFile({ name: f.name, path: window.api.getFilePath(f) })
    setPassword('')
    setConfirmPassword('')
  }

  const passwordsMatch = !password || !confirmPassword || password === confirmPassword
  const isValid = !!file && !!password && password === confirmPassword

  const handleProtect = async () => {
    if (!isValid || !file) return
    setIsProcessing(true)
    try {
      const res = await window.api.protectPdf({ filePath: file.path, userPassword: password, permissions })
      if (!res.success) throw new Error(res.error)

      setIsProcessing(false)
      const saveRes = await window.api.saveFile(res.outputPath!, `${file.name.replace('.pdf', '')}_protected.pdf`)
      if (saveRes.canceled) toast.info('Save canceled.')
      else if (saveRes.success) { toast.success('PDF protected!'); setFile(null); setPassword(''); setConfirmPassword('') }
      else throw new Error(saveRes.error)
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  const toggle = (key: keyof typeof permissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2">Protect PDF</h1>
          <p className="text-muted">Encrypt a PDF with a password to prevent unauthorized access.</p>
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

            <div className="bg-secondary border border-border rounded-xl p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-accent" />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                  className={cn("w-full bg-background border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent",
                    !passwordsMatch ? "border-danger" : "border-border")} />
                {!passwordsMatch && <p className="text-sm text-danger mt-1">Passwords don't match.</p>}
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium text-foreground mb-3">Permissions</p>
                {(['printing', 'copying', 'modifying'] as const).map(key => (
                  <label key={key} className="flex items-center gap-3 py-2 cursor-pointer">
                    <input type="checkbox" checked={permissions[key]} onChange={() => toggle(key)} className="w-4 h-4 accent-accent" />
                    <span className="text-sm text-foreground capitalize">Allow {key}</span>
                  </label>
                ))}
              </div>

              <PrimaryButton onClick={handleProtect} disabled={!isValid} className="w-full">
                Protect PDF
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
      <ProgressModal isOpen={isProcessing} title="Protecting PDF" status="Encrypting with AES-256..." />
    </div>
  )
}
