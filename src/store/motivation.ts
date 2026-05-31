import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { quoteKey, type ApiQuote } from '@/lib/quotes'

interface MotivationState {
  favorites: ApiQuote[]
  toggleFavorite: (q: ApiQuote) => void
  isFavorite: (q: ApiQuote) => boolean
}

export const useMotivation = create<MotivationState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (q) =>
        set((s) => {
          const key = quoteKey(q)
          const exists = s.favorites.some((f) => quoteKey(f) === key)
          return { favorites: exists ? s.favorites.filter((f) => quoteKey(f) !== key) : [...s.favorites, q] }
        }),
      isFavorite: (q) => get().favorites.some((f) => quoteKey(f) === quoteKey(q)),
    }),
    { name: 'td-motivation', version: 2 },
  ),
)
