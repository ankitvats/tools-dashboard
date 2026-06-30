import { useEffect, useState } from 'react'
import { Heart, MessageSquare, Clock, ExternalLink, RefreshCw, Code2 } from 'lucide-react'
import { Card, CardContent, Button, Badge, PageHeader } from '@/components/ui/primitives'
import { fetchDevBytes, DEV_TAGS, type DevArticle, type DevTag } from '@/lib/devbytes'
import { cn } from '@/lib/utils'

export default function DevBytes() {
  const [tag, setTag] = useState<DevTag>('webdev')
  const [articles, setArticles] = useState<DevArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = (t: DevTag, signal?: AbortSignal) => {
    setLoading(true)
    setError(false)
    fetchDevBytes(t, signal)
      .then((a) => { setArticles(a); setLoading(false) })
      .catch(() => { if (signal?.aborted) return; setError(true); setLoading(false) })
  }

  useEffect(() => {
    const ctrl = new AbortController()
    load(tag, ctrl.signal)
    return () => ctrl.abort()
  }, [tag])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Frontend Bytes"
        subtitle="Top dev articles this week, from DEV.to."
        action={
          <Button variant="outline" size="sm" onClick={() => load(tag)} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {DEV_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
              tag === t
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            #{t}
          </button>
        ))}
      </div>

      {error ? (
        <Card>
          <CardContent className="grid place-items-center gap-3 py-16 text-center">
            <Code2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Couldn't load articles. Check your connection.</p>
            <Button onClick={() => load(tag)}><RefreshCw className="h-4 w-4" /> Try again</Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="h-44 animate-pulse p-5" /></Card>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">No articles found for #{tag}.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => <ArticleCard key={a.id} a={a} />)}
        </div>
      )}
    </div>
  )
}

function ArticleCard({ a }: { a: DevArticle }) {
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block focus-ring rounded-xl"
    >
      <Card className="flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-soft">
        {a.coverImage && (
          <div className="aspect-[2/1] w-full overflow-hidden bg-secondary">
            <img
              src={a.coverImage}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}
        <CardContent className="flex flex-1 flex-col p-5">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {a.tags.slice(0, 3).map((t) => (
              <Badge key={t} tone="muted" className="text-[10px]">#{t}</Badge>
            ))}
          </div>
          <h3 className="font-semibold leading-snug text-balance group-hover:text-primary">
            {a.title}
          </h3>
          {a.description && (
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
          )}

          <div className="mt-auto pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {a.authorImage && <img src={a.authorImage} alt="" className="h-5 w-5 rounded-full" loading="lazy" />}
              <span className="truncate">{a.author}</span>
              <span>·</span>
              <span className="shrink-0">{a.publishedDate}</span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {a.reactions}</span>
              <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {a.comments}</span>
              {a.readingMinutes > 0 && (
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {a.readingMinutes} min</span>
              )}
              <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  )
}
