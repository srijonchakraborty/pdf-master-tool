import { BookOpen, LayoutGrid, FolderOpen, Moon, Sun, Maximize, Minimize, FileText, Code2 } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { toast } from 'sonner'
import { cn } from '../lib/utils'
import { DeveloperModal } from './DeveloperModal'
import { GithubIcon } from './GithubIcon'

export function TopNavbar() {
  const { currentToolId, setCurrentToolId, theme, setTheme, viewerFile, openInViewer } = useAppStore()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isDevModalOpen, setIsDevModalOpen] = useState(false)

  const handleOpenPdf = async () => {
    try {
      const res = await window.api.openFileDialog()
      if (res.canceled) return
      if (!res.success || !res.filePath) {
        toast.error(res.error || 'Failed to open file')
        return
      }

      openInViewer({
        path: res.filePath,
        name: res.name || 'document.pdf',
        size: res.size,
        data: res.data
      })
      toast.success(`Opened ${res.name}`)
    } catch (err: any) {
      toast.error(`Error opening file: ${err.message}`)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const isReaderActive = currentToolId === 'pdf-reader'

  return (
    <header className="h-14 border-b border-border bg-secondary flex items-center justify-between px-4 z-30 select-none flex-shrink-0">
      {/* Left: Branding & Main Navigation Modes */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentToolId(null)}
          className="flex items-center gap-2.5 font-bold text-base hover:opacity-90 transition-opacity text-foreground"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-white shadow-sm font-black text-sm">
            PDF
          </div>
          <span className="hidden sm:inline tracking-tight font-semibold">PDF Master</span>
        </button>

        <div className="h-5 w-px bg-border mx-1 hidden sm:block" />

        {/* Primary Top Nav Tabs */}
        <nav className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentToolId(null)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              !isReaderActive && currentToolId === null
                ? "bg-accent/15 text-accent shadow-sm"
                : "text-muted hover:text-foreground hover:bg-elevated"
            )}
            title="Browse all 29 PDF Tools"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden md:inline">Dashboard & Tools</span>
          </button>

          <button
            onClick={() => setCurrentToolId('pdf-reader')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all relative group",
              isReaderActive
                ? "bg-accent text-white shadow-sm shadow-accent/25"
                : "text-muted hover:text-foreground hover:bg-elevated"
            )}
            title="Open Adobe-style PDF Reader with Highlights, Navigation & Annotations"
          >
            <BookOpen className="w-4 h-4" />
            <span>PDF Reader & Viewer</span>
            <span className={cn(
              "text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full transition-colors",
              isReaderActive ? "bg-white/20 text-white" : "bg-accent/20 text-accent group-hover:bg-accent/30"
            )}>
              Adobe Mode
            </span>
          </button>

          {/* Developer Menu Link */}
          <button
            onClick={() => setIsDevModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-elevated transition-all"
            title="Developer: Srijon Chakraborty"
          >
            <GithubIcon className="w-4 h-4 text-accent" />
            <span className="hidden sm:inline">Developer</span>
          </button>
        </nav>
      </div>

      {/* Center: Current Document indicator (if open in reader) */}
      {isReaderActive && viewerFile && (
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-elevated/70 border border-border text-xs text-foreground max-w-sm truncate">
          <FileText className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <span className="truncate font-medium">{viewerFile.name}</span>
        </div>
      )}

      {/* Right: Quick Open & Utilities */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleOpenPdf}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-elevated hover:bg-elevated/80 border border-border hover:border-accent/40 rounded-lg text-xs font-semibold text-foreground transition-all shadow-sm"
          title="Open any PDF file in Reader"
        >
          <FolderOpen className="w-3.5 h-3.5 text-accent" />
          <span>Open PDF</span>
        </button>

        <div className="h-5 w-px bg-border mx-1" />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-elevated transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-elevated transition-colors hidden sm:block"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      {/* Developer Profile Modal */}
      <DeveloperModal
        isOpen={isDevModalOpen}
        onClose={() => setIsDevModalOpen(false)}
      />
    </header>
  )
}
