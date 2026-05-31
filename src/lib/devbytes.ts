// ── Types (normalized from the DEV.to articles API) ──────
export interface DevArticle {
  id: number
  title: string
  description: string
  url: string
  coverImage?: string
  publishedDate: string
  readingMinutes: number
  reactions: number
  comments: number
  tags: string[]
  author: string
  authorImage?: string
}

/** Curated frontend-flavoured tags the page lets you browse. */
export const DEV_TAGS = ['webdev', 'javascript', 'css', 'react', 'typescript', 'frontend', 'webperf', 'a11y'] as const
export type DevTag = (typeof DEV_TAGS)[number]

const API = 'https://dev.to/api/articles'

function normalize(d: any): DevArticle {
  return {
    id: d.id,
    title: d.title ?? '',
    description: d.description ?? '',
    url: d.url,
    coverImage: d.cover_image || d.social_image || undefined,
    publishedDate: d.readable_publish_date ?? '',
    readingMinutes: d.reading_time_minutes ?? 0,
    reactions: d.public_reactions_count ?? 0,
    comments: d.comments_count ?? 0,
    tags: d.tag_list ?? [],
    author: d.user?.name ?? 'Unknown',
    authorImage: d.user?.profile_image_90 || d.user?.profile_image || undefined,
  }
}

/**
 * Top articles for a tag over the trailing week.
 * `top=7` sorts by reactions across the last 7 days — the genuinely useful stuff.
 */
export async function fetchDevBytes(tag: DevTag, signal?: AbortSignal): Promise<DevArticle[]> {
  const res = await fetch(`${API}?tag=${encodeURIComponent(tag)}&top=7&per_page=24`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('malformed')
  return data.map(normalize)
}
