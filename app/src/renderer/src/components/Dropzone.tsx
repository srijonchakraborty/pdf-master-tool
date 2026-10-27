import { useState, useCallback } from 'react'
import { UploadCloud } from 'lucide-react'
import { cn } from '../lib/utils'

interface DropzoneProps {
  onFileSelect: (files: FileList) => void
  accept?: string
  multiple?: boolean
}

export function Dropzone({ onFileSelect, accept = ".pdf", multiple = false }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true)
    } else if (e.type === 'dragleave') {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files)
    }
  }, [onFileSelect])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files)
    }
  }

  return (
    <div 
      className={cn(
        "relative flex flex-col items-center justify-center w-full max-w-2xl mx-auto h-64 border-2 border-dashed rounded-xl transition-all cursor-pointer bg-elevated/50",
        isDragging 
          ? "border-accent bg-accent/5 scale-[1.02] shadow-[0_0_20px_rgba(109,91,255,0.15)]" 
          : "border-border hover:border-accent/50 hover:bg-elevated"
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />
      <div className="flex flex-col items-center justify-center text-center p-6 pointer-events-none">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors",
          isDragging ? "bg-accent/20 text-accent" : "bg-secondary text-muted"
        )}>
          <UploadCloud className="w-6 h-6" />
        </div>
        <p className="text-lg font-medium text-foreground mb-1">
          Drag & drop your PDF here
        </p>
        <p className="text-sm text-muted">
          or click to browse files
        </p>
      </div>
    </div>
  )
}
