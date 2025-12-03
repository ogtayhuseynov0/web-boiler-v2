import { create } from 'zustand'

interface AppState {
  // Add your global state here
}

export const useAppStore = create<AppState>()(() => ({
  // Initial state
}))
