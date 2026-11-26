import React, { useCallback, useEffect, useRef, useState } from 'react';
import Masthead, { TOPIC_TABS } from './components/Masthead';
import BroadsheetHome from './components/BroadsheetHome';
import ArticleDetail from './components/ArticleDetail';
import BroadsheetFooter from './components/BroadsheetFooter';
import {
  BroadsheetEmptyState,
  BroadsheetErrorBanner,
  BroadsheetSkeleton,
} from './components/States';
import AdminPortal from './views/AdminPortal';
import {
  API_BASE_URL,
  computeArticlesSignature,
  fetchArticles,
  fetchTopics,
  subscribeCatalogUpdates,
} from './services/api';

function parseRoute() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const hash = window.location.hash.toLowerCase();

  if (path === '/admin' || path.endsWith('/admin') || hash === '#admin') {
    return { view: 'admin', slug: null };
  }

  const articleMatch = path.match(/\/article\/([^/]+)$/);
  if (articleMatch) {
    return { view: 'article', slug: decodeURIComponent(articleMatch[1]) };
  }

  return { view: 'home', slug: null };
}

export default function App() {
  const [route, setRoute] = useState(parseRoute);

  // Public broadsheet state
  const [articles, setArticles] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [jurisdictions, setJurisdictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active filters
  const [activeTabId, setActiveTabId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('All Jurisdictions');

  // Selected article cache for smooth navigation
  const [activeArticle, setActiveArticle] = useState(null);
  // Preview article when inspecting from AdminPortal
  const [adminPreviewArticle, setAdminPreviewArticle] = useState(null);
  // Newly published notice banner (auto-dismissed)
  const [liveUpdateBanner, setLiveUpdateBanner] = useState(null);

  // Refs for silent ETag polling without flicker
  const etagRef = useRef(null);
  const signatureRef = useRef('');
  const knownIdsRef = useRef(new Set());
  const hasLoadedOnceRef = useRef(false);

  // Sync browser back/forward navigation
  useEffect(() => {
    const handleLocationChange = () => {
      const next = parseRoute();
      setRoute(next);
      if (next.view !== 'article') {
        setActiveArticle(null);
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load backend jurisdictions/categories metadata once
  useEffect(() => {
    if (route.view === 'admin') return;
    fetchTopics({ limit: 1 })
      .then((data) => {
        if (Array.isArray(data?.jurisdictions)) {
          setJurisdictions(data.jurisdictions);
        }
      })
      .catch(() => {
        // Non-fatal; dropdown gracefully falls back to All Jurisdictions
      });
  }, [route.view]);

  // Load articles when filters or view change; supports silent ETag polling
  const loadArticles = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
        setError(null);
        etagRef.current = null;
      }

      const activeTab = TOPIC_TABS.find((t) => t.id === activeTabId) || TOPIC_TABS[0];

      try {
        const data = await fetchArticles({
          category: activeTab.category,
          articleType: activeTab.articleType,
          jurisdiction: selectedJurisdiction,
          search: debouncedSearch,
          status: 'PUBLISHED',
          limit: 50,
          offset: 0,
          knownEtag: silent ? etagRef.current : null,
        });

        if (data.unchanged) {
          return;
        }

        etagRef.current = data.etag || null;
        const nextSignature = computeArticlesSignature(data.articles, data.total);

        if (silent && nextSignature === signatureRef.current) {
          return;
        }

        // Detect newly published article during live background sync
        if (silent && hasLoadedOnceRef.current) {
          const newlyAdded = data.articles.find((a) => !knownIdsRef.current.has(a.id));
          if (newlyAdded) {
            setLiveUpdateBanner(newlyAdded);
          }
        }

        signatureRef.current = nextSignature;
        knownIdsRef.current = new Set(data.articles.map((a) => a.id));
        hasLoadedOnceRef.current = true;
        setArticles(data.articles);
        setTotalRecords(data.total);
        if (silent) setError(null);
      } catch (err) {
        if (!silent) {
          setError(
            err.message ||
              'Unable to connect to the Verdicts backend service. Please verify the API server is running.'
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [activeTabId, selectedJurisdiction, debouncedSearch]
  );

  // Initial & filter-driven load
  useEffect(() => {
    if (route.view === 'home') {
      hasLoadedOnceRef.current = false;
      loadArticles({ silent: false });
    }
  }, [route.view, loadArticles]);

  // Automatic background live sync (ETag polling + cross-tab BroadcastChannel + window focus)
  useEffect(() => {
    if (route.view !== 'home') return;

    const pollId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadArticles({ silent: true });
      }
    }, 5000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadArticles({ silent: true });
      }
    };

    const unsubscribeSync = subscribeCatalogUpdates(() => {
      etagRef.current = null;
      loadArticles({ silent: true });
    });

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearInterval(pollId);
      unsubscribeSync();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [route.view, loadArticles]);

  // Auto-dismiss live update notice after 8 seconds
  useEffect(() => {
    if (!liveUpdateBanner) return;
    const timer = setTimeout(() => setLiveUpdateBanner(null), 8000);
    return () => clearTimeout(timer);
  }, [liveUpdateBanner]);

  const navigateTo = (nextPath, nextRoute) => {
    const basePrefix = window.location.pathname.startsWith('/app') ? '/app' : '';
    const targetUrl =
      nextPath === '/' && basePrefix ? basePrefix : `${basePrefix}${nextPath}`;

    if (window.location.pathname !== targetUrl || window.location.hash) {
      window.history.pushState({}, '', targetUrl);
    }
    setRoute(nextRoute);
  };

  const handleOpenArticle = (article) => {
    setActiveArticle(article);
    navigateTo(`/article/${encodeURIComponent(article.slug)}`, {
      view: 'article',
      slug: article.slug,
    });
  };

  const handleGoHome = () => {
    setActiveArticle(null);
    navigateTo('/', { view: 'home', slug: null });
  };

  const handleSelectTab = (tab) => {
    setActiveTabId(tab.id);
    if (route.view !== 'home') {
      handleGoHome();
    }
  };

  const handleResetFilters = () => {
    setActiveTabId('all');
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedJurisdiction('All Jurisdictions');
  };

  // Hidden /admin route (no public admin button anywhere on the broadsheet)
  if (route.view === 'admin') {
    if (adminPreviewArticle) {
      return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] py-8 px-4 sm:px-6 lg:px-8">
          <ArticleDetail
            slug={adminPreviewArticle.slug}
            initialArticle={adminPreviewArticle}
            onBack={() => setAdminPreviewArticle(null)}
          />
        </div>
      );
    }

    return (
      <AdminPortal
        onExitToUserPortal={() => {
          window.history.pushState({}, '', '/');
          setRoute({ view: 'home', slug: null });
        }}
        onSelectArticle={(art) => setAdminPreviewArticle(art)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col">
      <Masthead
        activeTabId={activeTabId}
        onSelectTab={handleSelectTab}
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          if (route.view !== 'home') {
            handleGoHome();
          }
        }}
        selectedJurisdiction={selectedJurisdiction}
        onJurisdictionChange={(jur) => {
          setSelectedJurisdiction(jur);
          if (route.view !== 'home') {
            handleGoHome();
          }
        }}
        jurisdictions={jurisdictions}
        totalCount={totalRecords}
        onGoHome={() => {
          handleResetFilters();
          handleGoHome();
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {route.view === 'article' ? (
          <ArticleDetail
            slug={route.slug}
            initialArticle={activeArticle}
            onBack={handleGoHome}
          />
        ) : (
          <>
            {loading && <BroadsheetSkeleton />}

            {!loading && error && (
              <BroadsheetErrorBanner
                message={error}
                apiBaseUrl={API_BASE_URL || window.location.origin}
                onRetry={loadArticles}
              />
            )}

            {!loading && !error && articles.length === 0 && (
              <BroadsheetEmptyState onReset={handleResetFilters} />
            )}

            {!loading && !error && articles.length > 0 && (
              <>
                {liveUpdateBanner && (
                  <div className="mb-5 bg-[#FFFFFF] border border-[#D1D5DB] border-l-4 border-l-[#991B1B] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs sm:text-sm text-[#111827] flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 bg-[#991B1B] text-white text-[11px] font-semibold shrink-0">
                        New Ruling Published
                      </span>
                      <span className="font-serif-headline font-bold truncate">
                        {liveUpdateBanner.case_name || liveUpdateBanner.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const target = liveUpdateBanner;
                          setLiveUpdateBanner(null);
                          handleOpenArticle(target);
                        }}
                        className="text-xs font-semibold text-[#1E3A5F] hover:underline cursor-pointer"
                      >
                        Read Ruling
                      </button>
                      <button
                        type="button"
                        onClick={() => setLiveUpdateBanner(null)}
                        className="text-xs text-[#4B5563] hover:text-[#111827] cursor-pointer"
                        aria-label="Dismiss update banner"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
                <BroadsheetHome
                  articles={articles}
                  onOpenArticle={handleOpenArticle}
                />
              </>
            )}
          </>
        )}
      </main>

      <BroadsheetFooter />
    </div>
  );
}
