import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { wordKey, type WordEntry } from '@/lib/dictionary'

interface VocabularyState {
  saved: WordEntry[]
  toggleSaved: (w: WordEntry) => void
  isSaved: (w: WordEntry) => boolean
}

export const useVocabulary = create<VocabularyState>()(
  persist(
    (set, get) => ({
      saved: [],
      toggleSaved: (w) =>
        set((s) => {
          const key = wordKey(w)
          const exists = s.saved.some((f) => wordKey(f) === key)
          return { saved: exists ? s.saved.filter((f) => wordKey(f) !== key) : [w, ...s.saved] }
        }),
      isSaved: (w) => get().saved.some((f) => wordKey(f) === wordKey(w)),
    }),
    { name: 'td-vocabulary', version: 1 },
  ),
)
