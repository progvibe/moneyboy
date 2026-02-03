import { and, desc, eq, gte } from 'drizzle-orm'
import { db } from '@/db/client'
import { dashboardThemeCache, documentChunks, documents } from '@/db/schema'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const DEFAULT_WINDOW_HOURS = 24
const DEFAULT_THEME_COUNT = 6
const MAX_CHUNKS = 300
const MAX_THEMES = 10
const MIN_THEMES = 3
type ChunkRow = {
  id: string
  text: string
  embedding: string
  publishedAt: Date
  documentId: string
  title: string
  tickers: string[]
}

type Cluster = {
  id: string
  centroid: number[]
  items: ClusterItem[]
}

type ClusterItem = {
  id: string
  text: string
  embedding: number[]
  documentId: string
  title: string
  tickers: string[]
}

export type DashboardTheme = {
  id: string
  label: string
  summary: string
  count: number
  querySeed: string
  tickers?: string[]
}

export type DashboardThemesResponse = {
  generatedAt: string
  windowHours: number
  themes: DashboardTheme[]
  dailySummary?: string
}

type ThemeCopy = {
  label: string
  summary: string
}

function parseWindowHours(value?: string | null) {
  if (!value) return DEFAULT_WINDOW_HOURS
  const normalized = value.trim().toLowerCase()
  const numeric = Number.parseFloat(normalized.replace('h', ''))
  if (!Number.isFinite(numeric) || numeric <= 0) return DEFAULT_WINDOW_HOURS
  return Math.min(Math.max(Math.round(numeric), 1), 168)
}

function parseThemeCount(value?: string | null) {
  if (!value) return DEFAULT_THEME_COUNT
  const numeric = Number.parseInt(value, 10)
  if (!Number.isFinite(numeric)) return DEFAULT_THEME_COUNT
  return Math.min(Math.max(numeric, MIN_THEMES), MAX_THEMES)
}

function getCacheDate() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function parseCachedPayload(raw: string): DashboardThemesResponse | null {
  try {
    return JSON.parse(raw) as DashboardThemesResponse
  } catch {
    return null
  }
}

function safeParseEmbedding(raw: string): number[] | null {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.map((v) => Number(v)).filter((v) => Number.isFinite(v))
  } catch {
    return null
  }
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const av = a[i]
    const bv = b[i]
    dot += av * bv
    na += av * av
    nb += bv * bv
  }
  if (!na || !nb) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function meanVector(vectors: number[][]): number[] {
  const dim = vectors[0]?.length ?? 0
  const sum = new Array(dim).fill(0)
  vectors.forEach((vector) => {
    for (let i = 0; i < dim; i++) {
      sum[i] += vector[i] ?? 0
    }
  })
  return sum.map((value) => value / vectors.length)
}

function kmeans(items: ClusterItem[], k: number, iterations = 6): Cluster[] {
  if (items.length === 0) return []
  const centroids = items.slice(0, k).map((item) => item.embedding)
  const assignments = new Array(items.length).fill(0)

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < items.length; i++) {
      const embedding = items[i].embedding
      let bestIdx = 0
      let bestScore = -Infinity
      for (let c = 0; c < centroids.length; c++) {
        const score = cosineSim(embedding, centroids[c])
        if (score > bestScore) {
          bestScore = score
          bestIdx = c
        }
      }
      assignments[i] = bestIdx
    }

    const bucket: number[][][] = Array.from({ length: k }, () => [])
    for (let i = 0; i < items.length; i++) {
      const clusterIndex = assignments[i]
      bucket[clusterIndex].push(items[i].embedding)
    }

    for (let c = 0; c < k; c++) {
      if (bucket[c].length === 0) {
        centroids[c] = items[Math.floor(Math.random() * items.length)].embedding
      } else {
        centroids[c] = meanVector(bucket[c])
      }
    }
  }

  const clusters: Cluster[] = Array.from({ length: k }, (_, idx) => ({
    id: `cluster-${idx + 1}`,
    centroid: centroids[idx],
    items: [],
  }))

  for (let i = 0; i < items.length; i++) {
    clusters[assignments[i]].items.push(items[i])
  }

  return clusters.filter((cluster) => cluster.items.length > 0)
}

function topTickers(items: ClusterItem[], limit = 3) {
  const counts = new Map<string, number>()
  items.forEach((item) => {
    item.tickers.forEach((ticker) => {
      counts.set(ticker, (counts.get(ticker) ?? 0) + 1)
    })
  })
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([ticker]) => ticker)
}

function truncate(text: string, max = 220) {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

function safeJsonExtract(raw: string): { dailySummary?: string; themes?: ThemeCopy[] } | null {
  try {
    return JSON.parse(raw)
  } catch {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return null
    try {
      return JSON.parse(raw.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

async function generateThemeCopy(
  clusters: Cluster[],
): Promise<{ dailySummary?: string; themes: ThemeCopy[] }> {
  const fallback = clusters.map((cluster, idx) => ({
    label: `Theme ${idx + 1}`,
    summary: truncate(cluster.items[0]?.text ?? 'No summary available.', 140),
  }))

  if (!OPENAI_API_KEY || clusters.length === 0) {
    return { themes: fallback }
  }

  const payload = clusters.map((cluster, idx) => ({
    id: cluster.id,
    index: idx + 1,
    samples: cluster.items
      .slice(0, 3)
      .map((item) => truncate(item.text, 240)),
  }))

  const prompt = `
You are a financial research assistant. Given clustered news snippets, label each theme and write a one-sentence summary.

Rules:
- Return ONLY valid JSON.
- Keep labels 3-5 words.
- Summaries must be 1 sentence, conservative, and avoid invented facts.
- Use the same order as input.

Input clusters:
${JSON.stringify(payload, null, 2)}

Output JSON schema:
{
  "dailySummary": "One paragraph summary (optional but helpful).",
  "themes": [
    { "label": "3-5 words", "summary": "1 sentence" }
  ]
}
`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a concise financial research assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 300,
    }),
  })

  if (!res.ok) {
    return { themes: fallback }
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = json.choices?.[0]?.message?.content?.trim() ?? ''
  const parsed = safeJsonExtract(content)
  if (!parsed?.themes?.length) {
    return { themes: fallback }
  }

  const merged = clusters.map((_, idx) => ({
    label: parsed.themes?.[idx]?.label ?? fallback[idx].label,
    summary: parsed.themes?.[idx]?.summary ?? fallback[idx].summary,
  }))

  return { dailySummary: parsed.dailySummary, themes: merged }
}

async function buildDashboardThemes(windowHours: number, k: number): Promise<DashboardThemesResponse> {
  const from = new Date(Date.now() - windowHours * 60 * 60 * 1000)

  const rows: ChunkRow[] = await db
    .select({
      id: documentChunks.id,
      text: documentChunks.text,
      embedding: documentChunks.embedding,
      publishedAt: documentChunks.publishedAt,
      documentId: documentChunks.documentId,
      title: documents.title,
      tickers: documents.tickers,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(gte(documentChunks.publishedAt, from))
    .orderBy(desc(documentChunks.publishedAt))
    .limit(MAX_CHUNKS)

  const items: ClusterItem[] = rows
    .map((row) => {
      const embedding = safeParseEmbedding(row.embedding)
      if (!embedding || embedding.length === 0) return null
      return {
        id: row.id,
        text: row.text,
        embedding,
        documentId: row.documentId,
        title: row.title,
        tickers: row.tickers ?? [],
      }
    })
    .filter(Boolean) as ClusterItem[]

  if (items.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      windowHours,
      themes: [],
    }
  }

  const themeCount = Math.min(k, items.length)
  const clusters = kmeans(items, themeCount)
  const copy = await generateThemeCopy(clusters)

  const themes: DashboardTheme[] = clusters.map((cluster, idx) => {
    const centroid = cluster.centroid
    const ranked = cluster.items
      .map((item) => ({
        item,
        score: cosineSim(item.embedding, centroid),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.item)

    const tickers = topTickers(cluster.items, 3)
    const label = copy.themes[idx]?.label ?? `Theme ${idx + 1}`
    const summary = copy.themes[idx]?.summary ?? truncate(ranked[0]?.text ?? '', 140)
    const querySeed = tickers.length ? `${label} ${tickers.join(' ')}` : label

    return {
      id: cluster.id,
      label,
      summary,
      count: cluster.items.length,
      querySeed,
      tickers: tickers.length ? tickers : undefined,
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    windowHours,
    themes,
    dailySummary: copy.dailySummary,
  }
}

export async function getDashboardThemes(options?: {
  window?: string | null
  k?: string | null
  windowHours?: number
  themeCount?: number
  force?: boolean
}): Promise<DashboardThemesResponse> {
  const windowHours =
    options?.windowHours ?? parseWindowHours(options?.window ?? null)
  const themeCount = options?.themeCount ?? parseThemeCount(options?.k ?? null)
  const force = options?.force ?? false

  const cacheDate = getCacheDate()

  let cachedPayload: DashboardThemesResponse | null = null

  if (!force) {
    const cached = await db
      .select({
        payload: dashboardThemeCache.payload,
      })
      .from(dashboardThemeCache)
      .where(
        and(
          eq(dashboardThemeCache.cacheDate, cacheDate),
          eq(dashboardThemeCache.windowHours, windowHours),
          eq(dashboardThemeCache.themeCount, themeCount),
        ),
      )
      .limit(1)

    cachedPayload = cached.length
      ? parseCachedPayload(cached[0].payload)
      : null

    if (cachedPayload) return cachedPayload
  }

  try {
    const payload = await buildDashboardThemes(windowHours, themeCount)

    await db
      .insert(dashboardThemeCache)
      .values({
        cacheDate,
        windowHours,
        themeCount,
        payload: JSON.stringify(payload),
        generatedAt: new Date(payload.generatedAt),
      })
      .onConflictDoUpdate({
        target: [
          dashboardThemeCache.cacheDate,
          dashboardThemeCache.windowHours,
          dashboardThemeCache.themeCount,
        ],
        set: {
          payload: JSON.stringify(payload),
          generatedAt: new Date(payload.generatedAt),
        },
      })

    return payload
  } catch (error) {
    if (cachedPayload) return cachedPayload
    throw error
  }
}

export { parseWindowHours, parseThemeCount }
