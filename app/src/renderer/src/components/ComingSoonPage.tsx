import { useAppStore } from '../store/appStore'
import { ArrowLeft, Clock } from 'lucide-react'

interface ComingSoonPageProps {
  toolName: string
  description: string
  phase?: number
}

export function ComingSoonPage({ toolName, description, phase = 4 }: ComingSoonPageProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto">
          <Clock className="w-10 h-10 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-3">{toolName}</h1>
          <p className="text-muted leading-relaxed">{description}</p>
        </div>
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent px-4 py-2 rounded-full text-sm font-medium">
          Phase {phase} — Advanced Feature
        </div>
        <button
          onClick={() => useAppStore.getState().setCurrentToolId(null)}
          className="flex items-center gap-2 mx-auto text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}
