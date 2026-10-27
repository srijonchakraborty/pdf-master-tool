import { ExternalLink, X, Copy, Check, Code2, Heart, Award } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { GithubIcon } from './GithubIcon'

interface DeveloperModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DeveloperModal({ isOpen, onClose }: DeveloperModalProps) {
  const [copied, setCopied] = useState(false)
  const devName = "Srijon Chakraborty"
  const githubUrl = "https://github.com/srijonchakraborty"

  if (!isOpen) return null

  const handleOpenGithub = async () => {
    try {
      await window.api.openExternal(githubUrl)
    } catch {
      window.open(githubUrl, '_blank')
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(githubUrl)
    setCopied(true)
    toast.success('GitHub URL copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-secondary border border-border rounded-2xl shadow-2xl overflow-hidden text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header background banner */}
        <div className="h-28 bg-gradient-to-r from-accent via-accent-hover to-purple-600 relative flex items-end px-6 pb-3">
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar badge */}
        <div className="relative px-6 -mt-10 mb-4 flex items-end justify-between">
          <div className="w-20 h-20 rounded-2xl bg-secondary border-4 border-secondary p-1 shadow-xl">
            <div className="w-full h-full rounded-xl bg-gradient-to-br from-accent to-purple-700 flex items-center justify-center text-white font-extrabold text-2xl shadow-inner">
              SC
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-semibold flex items-center gap-1.5 border border-accent/20">
            <Code2 className="w-3.5 h-3.5" />
            Lead Developer
          </span>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              {devName}
            </h3>
            <p className="text-xs text-muted mt-0.5">Creator & Architect of PDF Master Toolkit</p>
          </div>

          <p className="text-sm text-muted leading-relaxed">
            Crafted with passion to deliver a fast, completely offline, and privacy-respecting PDF powerhouse with native reader, highlight annotations, and 29+ conversion tools.
          </p>

          {/* GitHub Card Link */}
          <div className="p-3.5 rounded-xl bg-elevated border border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 text-foreground border border-border">
                <GithubIcon className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-muted">GitHub Profile</p>
                <p className="text-xs font-semibold text-accent truncate">{githubUrl}</p>
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              className="p-2 rounded-lg hover:bg-secondary text-muted hover:text-foreground transition-colors flex-shrink-0"
              title="Copy GitHub URL"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-2.5">
            <button
              onClick={handleOpenGithub}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-accent/20"
            >
              <GithubIcon className="w-4 h-4" />
              <span>Visit GitHub</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>

            <button
              onClick={onClose}
              className="py-2.5 px-4 bg-elevated hover:bg-elevated/80 border border-border rounded-xl text-sm font-medium text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Footer tiny text */}
        <div className="py-2.5 bg-elevated/50 border-t border-border/60 text-center text-[11px] text-muted flex items-center justify-center gap-1">
          <span>Crafted with</span>
          <Heart className="w-3 h-3 text-danger fill-current" />
          <span>by Srijon Chakraborty</span>
        </div>
      </div>
    </div>
  )
}
