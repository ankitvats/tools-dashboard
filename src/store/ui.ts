import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarCollapsed: boolean
  toolboxCollapsed: boolean
  toggleSidebar: () => void
  setSidebar: (collapsed: boolean) => void
  toggleToolbox: () => void
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toolboxCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebar: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleToolbox: () => set((s) => ({ toolboxCollapsed: !s.toolboxCollapsed })),
    }),
    { name: 'td-ui' },
  ),
)
