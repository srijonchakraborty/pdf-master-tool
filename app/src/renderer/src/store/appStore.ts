import { create } from 'zustand'

export type ToolCategory = 'Organize' | 'Convert' | 'Edit' | 'Security' | 'Optimize & Recover' | 'All'

export interface ViewerFile {
  path: string
  name: string
  size?: number
  data?: Uint8Array
}

export interface AppState {
  theme: 'dark' | 'light'
  currentToolId: string | null
  viewerFile: ViewerFile | null
  setTheme: (theme: 'dark' | 'light') => void
  setCurrentToolId: (toolId: string | null) => void
  setViewerFile: (file: ViewerFile | null) => void
  openInViewer: (file: ViewerFile) => void
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  currentToolId: null,
  viewerFile: null,
  setTheme: (theme) => set({ theme }),
  setCurrentToolId: (currentToolId) => set({ currentToolId }),
  setViewerFile: (viewerFile) => set({ viewerFile }),
  openInViewer: (viewerFile) => set({ viewerFile, currentToolId: 'pdf-reader' })
}))
