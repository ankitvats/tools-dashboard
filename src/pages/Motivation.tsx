import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, Heart, Share2, Quote as QuoteIcon } from 'lucide-react'
import { Card, CardContent, Button, PageHeader } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { fetchRandomQuote, getDailyQuote, localDailyQuote, quoteKey, type ApiQuote } from '@/lib/quotes'
import { useMotivation } from '@/store/motivation'
import { cn } from '@/lib/utils'

export default function Motivation() {
  const { favorites, toggleFavorite } = useMotivation()
  const { toast } = useToast()
  const [current, setCurrent] = useState<ApiQuote>(() => localDailyQuote())
  const [loading, setLoading] = useState(false)

  // load today's (cached) quote from the API on mount
  useEffect(() => {
    const ctrl = new AbortController()
    getDailyQuote(ctrl.signal).then(setCurrent).catch(() => {})
    return () => ctrl.abort()
  }, [])

  const refresh = async () => {
    setLoading(true)
    const q = await fetchRandomQuote()
    setCurrent(q)
    setLoading(false)
  }

  const share = async (q: ApiQuote) => {
    const payload = `"${q.text}" — ${q.author}`
    try {
      if (navigator.share) await navigator.share({ text: payload })
      else {
        await navigator.clipboard.writeText(payload)
        toast({ kind: 'success', title: 'Copied to clipboard' })
      }
    } catch {
      /* user cancelled */
    }
  }

  const isFav = favorites.some((f) => quoteKey(f) === quoteKey(current))

  return (
    <div className="space-y-6">
      <PageHeader title="Daily Motivation" subtitle="A fresh spark, fetched daily." />

      <AnimatePresence mode="wait">
        <motion.div
          key={quoteKey(current)}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        >
          <Card className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-card">
            <CardContent className="p-8 sm:p-12">
              <QuoteIcon className="h-10 w-10 text-primary/40" />
              <blockquote className="mt-4 text-2xl font-semibold leading-snug text-balance sm:text-3xl">
                {current.text}
              </blockquote>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <p className="text-lg font-medium">— {current.author}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => toggleFavorite(current)} aria-label="Favorite">
                    <Heart className={cn('h-5 w-5', isFav && 'fill-destructive text-destructive')} />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => share(current)} aria-label="Share">
                    <Share2 className="h-5 w-5" />
                  </Button>
                  <Button onClick={refresh} disabled={loading}>
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> New quote
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Heart className="h-4 w-4 text-destructive" /> Favorites
          <span className="text-sm font-normal text-muted-foreground">({favorites.length})</span>
        </h3>
        {favorites.length === 0 ? (
          <Card>
            <CardContent className="grid place-items-center gap-1 py-10 text-center">
              <p className="text-sm text-muted-foreground">No favorites yet. Tap the heart to save quotes you love.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {favorites.map((q) => (
              <Card key={quoteKey(q)}>
                <CardContent className="p-5">
                  <p className="text-sm leading-snug">"{q.text}"</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">— {q.author}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => share(q)} aria-label="Share">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleFavorite(q)} aria-label="Remove favorite">
                        <Heart className="h-4 w-4 fill-destructive text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
