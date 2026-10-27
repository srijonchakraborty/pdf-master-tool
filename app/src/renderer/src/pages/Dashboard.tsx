import { useState, useMemo } from 'react'
import { BookOpen, Sparkles, Highlighter, ArrowRight, ExternalLink } from 'lucide-react'
import { TOOLS } from '../config/tools'
import { ToolCard } from '../components/ToolCard'
import { useAppStore } from '../store/appStore'
import { DeveloperModal } from '../components/DeveloperModal'
import { GithubIcon } from '../components/GithubIcon'

export function Dashboard() {
  const setCurrentToolId = useAppStore(state => state.setCurrentToolId)
  const [isDevModalOpen, setIsDevModalOpen] = useState(false)

  const categories = useMemo(() => {
    const cats = ['Organize', 'Convert', 'Edit', 'Security', 'Optimize & Recover'] as const
    return cats.map(cat => ({
      name: cat,
      tools: TOOLS.filter(t => t.category === cat)
    }))
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
      <div className="max-w-5xl mx-auto space-y-10 pb-12">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Welcome to PDF Master Toolkit</h1>
          <p className="text-muted text-lg">Your offline-first, Swiss army knife for PDF files.</p>
        </header>

        {/* Featured Adobe-Style Reader Card */}
        <div 
          onClick={() => setCurrentToolId('pdf-reader')}
          className="p-6 rounded-2xl bg-gradient-to-r from-accent/20 via-accent/10 to-elevated border border-accent/40 hover:border-accent cursor-pointer transition-all shadow-md hover:shadow-xl hover:shadow-accent/10 group flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent text-white text-[11px] font-bold tracking-wider uppercase shadow-sm">
                <Sparkles className="w-3 h-3" /> Adobe Style
              </span>
              <h3 className="text-xl font-bold text-foreground group-hover:text-accent transition-colors">
                PDF Reader & Viewer
              </h3>
            </div>
            <p className="text-sm text-muted max-w-xl leading-relaxed">
              Full-featured viewer with text highlighting, freehand markings, sticky notes, page thumbnails, and content bookmarks navigation.
            </p>
          </div>

          <button className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-all flex-shrink-0 shadow-md group-hover:scale-105">
            <BookOpen className="w-4 h-4" />
            <span>Open PDF Reader</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>

        {categories.map(category => category.tools.length > 0 && (
          <section key={category.name}>
            <h2 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b border-border">
              {category.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {category.tools.map(tool => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        ))}

        {/* Footer: Developer Info */}
        <footer className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <span>PDF Master Toolkit</span>
            <span>•</span>
            <span>Offline-First Desktop Suite</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Developed by</span>
            <button
              onClick={() => setIsDevModalOpen(true)}
              className="font-semibold text-foreground hover:text-accent transition-colors"
            >
              Srijon Chakraborty
            </button>
            <span>•</span>
            <button
              onClick={() => setIsDevModalOpen(true)}
              className="flex items-center gap-1.5 text-accent hover:underline font-medium"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>github.com/srijonchakraborty</span>
            </button>
          </div>
        </footer>

        <DeveloperModal
          isOpen={isDevModalOpen}
          onClose={() => setIsDevModalOpen(false)}
        />
      </div>
    </div>
  )
}
