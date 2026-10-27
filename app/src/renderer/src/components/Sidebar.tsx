import { useState, useMemo } from 'react'
import { Search, ChevronDown, Moon, Sun, BookOpen, ExternalLink } from 'lucide-react'
import { TOOLS, ToolDef } from '../config/tools'
import { useAppStore } from '../store/appStore'
import { cn } from '../lib/utils'
import { DeveloperModal } from './DeveloperModal'
import { GithubIcon } from './GithubIcon'

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDevModalOpen, setIsDevModalOpen] = useState(false)
  const { currentToolId, setCurrentToolId, theme, setTheme } = useAppStore()

  const categories = useMemo(() => {
    const cats = ['All', 'Organize', 'Convert', 'Edit', 'Security', 'Optimize & Recover'] as const
    return cats.map(cat => ({
      name: cat,
      tools: TOOLS.filter(t => 
        (cat === 'All' || t.category === cat) &&
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }))
  }, [searchQuery])

  return (
    <div className="w-[240px] h-full flex flex-col bg-bg-secondary border-r border-border text-text-primary flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border flex flex-col gap-3">
        {/* PDF Reader Featured Button */}
        <button
          onClick={() => setCurrentToolId('pdf-reader')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border w-full text-left",
            currentToolId === 'pdf-reader'
              ? "bg-accent text-white border-accent shadow-sm"
              : "bg-elevated hover:bg-elevated/80 border-border text-foreground hover:border-accent/40"
          )}
        >
          <BookOpen className={cn("w-4 h-4 flex-shrink-0", currentToolId === 'pdf-reader' ? "text-white" : "text-accent")} />
          <span className="truncate">PDF Reader & Viewer</span>
          <span className={cn(
            "ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0",
            currentToolId === 'pdf-reader' ? "bg-white/20 text-white" : "bg-accent/20 text-accent"
          )}>
            ADOBE
          </span>
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text" 
            placeholder="Search tools..." 
            className="w-full bg-elevated border border-border rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-accent transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {categories.map(category => category.tools.length > 0 && category.name !== 'All' && (
          <div key={category.name} className="mb-4">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider px-2 mb-2">
              {category.name}
            </h4>
            <div className="flex flex-col gap-0.5">
              {category.tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setCurrentToolId(tool.id)}
                  className={cn(
                    "text-left px-3 py-2 text-sm rounded-md transition-colors",
                    currentToolId === tool.id 
                      ? "bg-accent/10 text-accent font-medium" 
                      : "text-foreground hover:bg-elevated"
                  )}
                >
                  {tool.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Developer Info & Theme Toggle */}
      <div className="p-3 border-t border-border bg-elevated/40 space-y-1.5 flex-shrink-0">
        <div 
          onClick={() => setIsDevModalOpen(true)}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-elevated cursor-pointer transition-colors group"
          title="Developer: Srijon Chakraborty (Click for info & GitHub)"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
              <GithubIcon className="w-4 h-4" />
            </div>
            <div className="truncate text-left">
              <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Dev</p>
              <p className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                Srijon Chakraborty
              </p>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-muted group-hover:text-foreground flex-shrink-0" />
        </div>

        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors w-full px-2 py-1.5 rounded-md hover:bg-elevated"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-warning" /> : <Moon className="w-3.5 h-3.5" />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      <DeveloperModal
        isOpen={isDevModalOpen}
        onClose={() => setIsDevModalOpen(false)}
      />
    </div>
  )
}
