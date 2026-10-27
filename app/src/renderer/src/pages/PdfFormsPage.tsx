import { useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { FileText, X, Search, PenLine, Info } from 'lucide-react'
import { cn } from '../lib/utils'

interface FormField {
  name: string
  type: string
  value: string | boolean
}

export function PdfFormsPage() {
  const [file, setFile] = useState<{ name: string; path: string } | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [values, setValues] = useState<Record<string, string | boolean>>({})
  const [flatten, setFlatten] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [noFields, setNoFields] = useState(false)

  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    setFile({ name: f.name, path: window.api.getFilePath(f) })
    setFields([])
    setValues({})
    setNoFields(false)
  }

  const detectFields = async () => {
    if (!file) return
    setIsDetecting(true)
    setNoFields(false)
    try {
      const res = await (window.api as any).detectFormFields(file.path)
      if (!res.success) throw new Error(res.error)
      if (!res.fields?.length) {
        setNoFields(true)
        setIsDetecting(false)
        return
      }
      const detectedFields: FormField[] = res.fields
      setFields(detectedFields)
      // Pre-populate with existing values
      const initValues: Record<string, string | boolean> = {}
      detectedFields.forEach((f: FormField) => { initValues[f.name] = f.value })
      setValues(initValues)
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
    setIsDetecting(false)
  }

  const handleSave = async () => {
    if (!file || !fields.length) return
    setIsSaving(true)
    try {
      const fieldValues = Object.entries(values).map(([name, value]) => ({ name, value }))
      const res = await (window.api as any).fillForm({ filePath: file.path, mode: 'fill', values: fieldValues, flatten })
      if (!res.success) throw new Error(res.error)
      setIsSaving(false)
      const saveRes = await window.api.saveFile(res.outputPath!, `${file.name.replace('.pdf', '')}_filled.pdf`)
      if (saveRes.canceled) toast.info('Save canceled.')
      else if (saveRes.success) { toast.success('Form filled and saved!'); setFile(null); setFields([]) }
      else throw new Error(saveRes.error)
    } catch (err: any) {
      setIsSaving(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  const updateValue = (name: string, value: string | boolean) => {
    setValues(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-3xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2">PDF Forms</h1>
          <p className="text-muted">Detect and fill interactive form fields in a PDF.</p>
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
              <button onClick={() => { setFile(null); setFields([]) }} className="p-2 text-muted hover:text-danger"><X className="w-5 h-5" /></button>
            </div>

            {!fields.length && !noFields && (
              <div className="flex flex-col items-center gap-4 py-8 bg-secondary border border-border rounded-xl">
                <Search className="w-12 h-12 text-accent/40" />
                <p className="text-muted text-center max-w-xs">Click below to detect interactive form fields in this PDF.</p>
                <PrimaryButton onClick={detectFields} disabled={isDetecting}>
                  {isDetecting ? 'Detecting…' : 'Detect Form Fields'}
                </PrimaryButton>
              </div>
            )}

            {noFields && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
                <Info className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">No form fields found</p>
                  <p className="text-sm text-muted mt-1">This PDF does not contain interactive AcroForm fields.</p>
                </div>
              </div>
            )}

            {fields.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-foreground">{fields.length} field{fields.length !== 1 ? 's' : ''} detected</h2>
                </div>

                <div className="bg-secondary border border-border rounded-xl divide-y divide-border overflow-hidden">
                  {fields.map(field => (
                    <div key={field.name} className="flex items-center gap-4 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{field.name}</p>
                        <p className="text-xs text-muted capitalize">{field.type}</p>
                      </div>
                      <div className="shrink-0 w-56">
                        {field.type === 'checkbox' ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox"
                              checked={!!values[field.name]}
                              onChange={e => updateValue(field.name, e.target.checked)}
                              className="w-4 h-4 accent-accent" />
                            <span className="text-sm text-muted">{values[field.name] ? 'Checked' : 'Unchecked'}</span>
                          </label>
                        ) : (
                          <input type="text"
                            value={String(values[field.name] ?? '')}
                            onChange={e => updateValue(field.name, e.target.value)}
                            placeholder="Enter value…"
                            className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={flatten} onChange={e => setFlatten(e.target.checked)} className="w-4 h-4 accent-accent" />
                    <span className="text-sm text-foreground">Flatten form (prevent further editing)</span>
                  </label>
                  <PrimaryButton onClick={handleSave} disabled={isSaving} className="px-8">
                    {isSaving ? 'Saving…' : 'Save Filled Form'}
                  </PrimaryButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <ProgressModal isOpen={isSaving} title="Saving Form" status="Writing field values…" />
    </div>
  )
}
