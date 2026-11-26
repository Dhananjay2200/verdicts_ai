/**
 * Verdicts — Backend API Service
 * Maps cleanly to the FastAPI backend endpoints under /api/v1.
 */

const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

export function buildApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export class ApiError extends Error {
  constructor(message, status = 0, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

async function requestJson(path, options = {}) {
  const url = buildApiUrl(path);
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    throw new ApiError(
      `Unable to reach the Verdicts backend at ${API_BASE_URL || window.location.origin}.`,
      0,
      true
    );
  }

  if (response.status === 304) {
    return {
      __notModified: true,
      etag: response.headers.get('etag') || options.knownEtag || null,
    };
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody?.detail) detail = errBody.detail;
    } catch {
      // Ignore non-JSON error body
    }
    throw new ApiError(detail, response.status, false);
  }

  const data = await response.json();
  return {
    data,
    etag: response.headers.get('etag') || null,
  };
}

/**
 * Formats an article date consistently using decision_date or published_at fallback.
 */
export function formatVerdictDate(article) {
  if (!article) return 'Date unavailable';
  if (article.decision_date && article.decision_date.trim()) {
    return article.decision_date.trim();
  }
  if (article.published_at) {
    const parsed = new Date(article.published_at);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return 'Archive Record';
}

/**
 * Normalizes backend article payloads with safe fallbacks for optional legal metadata.
 */
export function normalizeArticle(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const sourceUrl =
    raw.source_url ||
    raw.official_url ||
    raw.official_document_url ||
    raw.document_url ||
    raw.source_link ||
    raw.url ||
    null;

  return {
    ...raw,
    id: raw.id,
    title: raw.title || raw.case_name || 'Untitled Judicial Record',
    case_name: raw.case_name || raw.title || 'Untitled Judicial Record',
    slug: raw.slug || String(raw.id || ''),
    court: raw.court || raw.court_name || 'Apex Court of Record',
    jurisdiction: raw.jurisdiction || 'International',
    country: raw.country || raw.jurisdiction || 'Global',
    region: raw.region || raw.jurisdiction || 'Apex Jurisdiction',
    category: raw.category || 'Constitutional & Democratic Law',
    citation: raw.citation || raw.case_citation || 'Official Docket Record',
    decision_date: formatVerdictDate(raw),
    bench: raw.bench || 'Full Bench',
    vote_split: raw.vote_split || null,
    key_holding: raw.key_holding || '',
    summary: raw.summary || raw.meta_description || raw.key_holding || '',
    content: raw.content || raw.summary || '',
    article_type: raw.article_type || 'VERDICT_BRIEF',
    status: raw.status || 'PUBLISHED',
    is_landmark: Boolean(raw.is_landmark ?? raw.article_type === 'VERDICT_BRIEF'),
    primary_image_url: raw.primary_image_url || null,
    image_caption: raw.image_caption || '',
    image_attribution: raw.image_attribution || '',
    source_url: sourceUrl,
    tags_list: typeof raw.tags === 'string'
      ? raw.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : Array.isArray(raw.tags)
        ? raw.tags
        : [],
  };
}

/**
 * Fetch published or filtered articles from GET /api/v1/articles.
 * Supports HTTP ETag short-circuiting (304 Not Modified) for live polling.
 */
export async function fetchArticles({
  category,
  jurisdiction,
  articleType,
  year,
  search,
  status = 'PUBLISHED',
  limit = 50,
  offset = 0,
  knownEtag = null,
} = {}) {
  const params = new URLSearchParams();
  if (category && category !== 'All Categories') params.set('category', category);
  if (jurisdiction && jurisdiction !== 'All Jurisdictions') params.set('jurisdiction', jurisdiction);
  if (articleType && articleType !== 'ALL') params.set('article_type', articleType);
  if (year && year !== 'All Years') params.set('year', year);
  if (search && search.trim()) params.set('search', search.trim());
  if (status) params.set('status', status);
  params.set('limit', String(Math.min(limit, 100)));
  params.set('offset', String(Math.max(offset, 0)));

  const headers = knownEtag ? { 'If-None-Match': knownEtag } : {};
  const res = await requestJson(`/api/v1/articles?${params.toString()}`, {
    headers,
    knownEtag,
  });

  if (res.__notModified) {
    return { unchanged: true, etag: res.etag };
  }

  const data = res.data;
  return {
    unchanged: false,
    etag: res.etag,
    total: data.total ?? (data.articles ? data.articles.length : 0),
    limit: data.limit ?? limit,
    offset: data.offset ?? offset,
    articles: (data.articles || []).map(normalizeArticle).filter(Boolean),
  };
}

/**
 * Fetch single article and quality audits by slug from GET /api/v1/articles/slug/{slug}.
 */
export async function fetchArticleBySlug(slug) {
  const res = await requestJson(`/api/v1/articles/slug/${encodeURIComponent(slug)}`);
  const data = res.data;
  const article = normalizeArticle(data.article || data);
  return {
    article,
    audits: data.audits || [],
  };
}

/**
 * Fetch single article by primary key ID from GET /api/v1/articles/id/{id}.
 */
export async function fetchArticleById(articleId) {
  const res = await requestJson(`/api/v1/articles/id/${articleId}`);
  return normalizeArticle(res.data);
}

/**
 * Fetch topics, jurisdictions, and categories from GET /api/v1/topics.
 */
export async function fetchTopics({ jurisdiction, category, articleType, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (jurisdiction) params.set('jurisdiction', jurisdiction);
  if (category) params.set('category', category);
  if (articleType) params.set('article_type', articleType);
  params.set('limit', String(limit));

  const res = await requestJson(`/api/v1/topics?${params.toString()}`);
  return res.data;
}

/**
 * Fetch publishing statistics from GET /api/v1/publishing/stats.
 */
export async function fetchPublishingStats({ knownEtag = null } = {}) {
  const headers = knownEtag ? { 'If-None-Match': knownEtag } : {};
  const res = await requestJson('/api/v1/publishing/stats', { headers, knownEtag });
  if (res.__notModified) {
    return { unchanged: true, etag: res.etag };
  }
  return { unchanged: false, etag: res.etag, stats: res.data };
}

/**
 * Check backend health from GET /api/v1/health.
 */
export async function checkBackendHealth() {
  const res = await requestJson('/api/v1/health');
  return res.data;
}

const SYNC_CHANNEL_NAME = 'verdicts_live_sync';
const SYNC_STORAGE_KEY = 'verdicts_live_sync_ping';

/**
 * Broadcasts an immediate update signal to all open tabs (user & admin).
 */
export function notifyCatalogUpdated(reason = 'publish') {
  const payload = { reason, ts: Date.now() };
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
      ch.postMessage(payload);
      ch.close();
    }
  } catch {
    // Ignore BroadcastChannel errors in restricted contexts
  }
  try {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Subscribes to cross-tab publish/update signals. Returns an unsubscribe function.
 */
export function subscribeCatalogUpdates(onUpdate) {
  let channel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event?.data) onUpdate(event.data);
      };
    }
  } catch {
    channel = null;
  }

  const onStorage = (event) => {
    if (event.key === SYNC_STORAGE_KEY && event.newValue) {
      try {
        onUpdate(JSON.parse(event.newValue));
      } catch {
        onUpdate({ reason: 'storage', ts: Date.now() });
      }
    }
  };

  window.addEventListener('storage', onStorage);

  return () => {
    if (channel) {
      try {
        channel.close();
      } catch {
        // Ignore close errors
      }
    }
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Computes a lightweight fingerprint of an articles array to avoid redundant re-renders.
 */
export function computeArticlesSignature(articles = [], total = 0) {
  const parts = articles.map((a) => `${a.id}:${a.status}:${a.updated_at || a.published_at || ''}`);
  return `${total}|${parts.join(',')}`;
}
