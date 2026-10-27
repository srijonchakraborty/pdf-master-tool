import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import { ToolDef } from '../config/tools'
import { useAppStore } from '../store/appStore'

interface ToolCardProps {
  tool: ToolDef
}

export function ToolCard({ tool }: ToolCardProps) {
  const setCurrentToolId = useAppStore(state => state.setCurrentToolId)
  
  // @ts-ignore dynamic icon mapping
  const IconComponent = Icons[tool.iconName] || Icons.File

  return (
    <motion.button
      whileHover={{ y: -2, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
      className="flex flex-col text-left bg-secondary p-5 rounded-xl border border-border hover:border-accent/50 transition-colors cursor-pointer group"
      onClick={() => setCurrentToolId(tool.id)}
    >
      <div className="bg-elevated p-3 rounded-lg w-12 h-12 flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
        <IconComponent className="w-6 h-6 text-accent" />
      </div>
      <h3 className="text-foreground font-semibold text-base mb-1">{tool.name}</h3>
      <p className="text-muted text-sm line-clamp-2">{tool.description}</p>
    </motion.button>
  )
}
