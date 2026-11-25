import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Filters from './components/Filters';
import VerdictCard from './components/VerdictCard';
import ArticleModal from './components/ArticleModal';
import NewsSection from './components/NewsSection';
import AdminPortal from './views/AdminPortal';
import Footer from './components/Footer';
import { Scale, Globe, BookMarked, RefreshCw, AlertCircle, Landmark } from 'lucide-react';
import { JURISDICTIONS_LIST } from './components/Filters';
import { apiUrl } from './config';

export default function App() {
  // Portal switcher: 'user' | 'admin'
  const [portal, setPortal] = useState(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#admin') return 'admin';
    return 'user';
  });

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Navigation & Tabs within User Portal
  const [activeTab, setActiveTab] = useState('verdicts'); // 'verdicts' | 'news' | 'jurisdictions' | 'bookmarks'
  
  // Modals
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('All Jurisdictions');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedYear, setSelectedYear] = useState('All Years');
  const [articleType, setArticleType] = useState('ALL');

  // Bookmarks
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('verdicts_ai_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const exploreRef = useRef(null);

  // Synchronize hash changes
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash.toLowerCase() === '#admin') {
        setPortal('admin');
      } else {
        setPortal('user');
        fetchArticles();
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Fetch articles from backend API
  const fetchArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedJurisdiction !== 'All Jurisdictions') params.append('jurisdiction', selectedJurisdiction);
      if (selectedCategory !== 'All Categories') params.append('category', selectedCategory);
      if (selectedYear !== 'All Years') params.append('year', selectedYear);
      if (articleType !== 'ALL') params.append('article_type', articleType);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(apiUrl(`/api/v1/articles?${params.toString()}`));
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      console.error('Failed to load articles:', err);
      setError('Unable to connect to the Verdicts AI backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (portal === 'user') {
      fetchArticles();
    }
  }, [portal, selectedJurisdiction, selectedCategory, selectedYear, articleType, searchQuery]);

  // Dynamically extract unique years from all articles + known landmark eras
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    articles.forEach((a) => {
      const text = `${a.decision_date || ''} ${a.citation || ''} ${a.published_at || ''}`;
      const matches = text.match(/\b(19\d\d|20\d\d)\b/g);
      if (matches) {
        matches.forEach((y) => yearsSet.add(y));
      }
    });
    // Add known key judicial years
    ["2026", "2024", "2021", "2020", "2019", "2017", "2001", "1995", "1992", "1988", "1986", "1973", "1954", "1932"].forEach((y) => yearsSet.add(y));
    const sorted = Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a));
    return ["All Years", ...sorted];
  }, [articles]);

  // Bookmarks toggle
  const handleToggleBookmark = (article) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.id === article.id);
      const updated = exists ? prev.filter((b) => b.id !== article.id) : [...prev, article];
      localStorage.setItem('verdicts_ai_bookmarks', JSON.stringify(updated));
      return updated;
    });
  };

  // Distinct feeds
  const landmarkVerdicts = useMemo(() => {
    return articles.filter((a) => a.article_type === 'VERDICT_BRIEF');
  }, [articles]);

  const legalNews = useMemo(() => {
    return articles.filter((a) => a.article_type === 'LEGAL_NEWS');
  }, [articles]);

  const featuredVerdict = useMemo(() => {
    return landmarkVerdicts[0] || articles[0] || null;
  }, [landmarkVerdicts, articles]);

  const scrollToExplore = () => {
    exploreRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // If Admin Portal is active, render full Admin Portal view
  if (portal === 'admin') {
    return (
      <div className="min-h-screen bg-[#070b19] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
        <AdminPortal
          onExitToUserPortal={() => {
            window.location.hash = '';
            setPortal('user');
          }}
          onSelectArticle={(art) => setSelectedArticle(art)}
        />
        {selectedArticle && (
          <ArticleModal
            article={selectedArticle}
            onClose={() => setSelectedArticle(null)}
            isBookmarked={bookmarks.some((b) => b.id === selectedArticle.id)}
            onToggleBookmark={handleToggleBookmark}
          />
        )}
      </div>
    );
  }

  // Otherwise, render Public User Portal (UserBlogPortal)
  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        bookmarksCount={bookmarks.length}
        onOpenAdmin={() => {
          window.location.hash = '#admin';
          setPortal('admin');
        }}
        newsTicker={legalNews.length > 0 ? legalNews : landmarkVerdicts}
      />

      {/* Hero Section */}
      <Hero
        onExploreClick={scrollToExplore}
        featuredVerdict={featuredVerdict}
        onReadVerdict={(art) => setSelectedArticle(art)}
      />

      {/* Main Content Area */}
      <main ref={exploreRef} className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        
        {/* Multi-Dimensional Filters with Decision Year */}
        <Filters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedJurisdiction={selectedJurisdiction}
          setSelectedJurisdiction={setSelectedJurisdiction}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          availableYears={availableYears}
          articleType={articleType}
          setArticleType={setArticleType}
          totalResults={
            activeTab === 'news' 
              ? legalNews.length 
              : activeTab === 'bookmarks' 
                ? bookmarks.length 
                : articles.length
          }
        />

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-sm font-medium">Accessing Supreme Judicial Archives & Case Precedents...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 rounded-xl bg-red-950/30 border border-red-500/40 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="font-serif-title text-lg font-bold text-red-200">{error}</h3>
            <p className="text-xs text-slate-400">Ensure the backend server is running on http://127.0.0.1:8002.</p>
            <button
              onClick={fetchArticles}
              className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-semibold hover:bg-red-500/30"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Active Tab: Landmark Verdicts */}
        {!loading && !error && activeTab === 'verdicts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="font-serif-title text-2xl font-bold text-white flex items-center gap-2">
                  <Landmark className="w-6 h-6 text-amber-400" />
                  <span>Landmark Supreme Court Verdicts & Precedents</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  12-Section encyclopedic analyses covering ratio decidendi, statutory tables, bench splits, and dissents.
                </p>
              </div>
            </div>

            {articles.length === 0 ? (
              <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400">
                <Scale className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm">No verdicts found matching your criteria. Try resetting filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => (
                  <VerdictCard
                    key={article.id}
                    article={article}
                    onRead={(art) => setSelectedArticle(art)}
                    isBookmarked={bookmarks.some((b) => b.id === article.id)}
                    onToggleBookmark={handleToggleBookmark}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Tab: Worldwide Legal News */}
        {!loading && !error && activeTab === 'news' && (
          <NewsSection
            newsArticles={legalNews}
            onRead={(art) => setSelectedArticle(art)}
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
          />
        )}

        {/* Active Tab: Jurisdictions Explorer */}
        {!loading && !error && activeTab === 'jurisdictions' && (
          <div className="space-y-6">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="font-serif-title text-2xl font-bold text-white flex items-center gap-2">
                <Globe className="w-6 h-6 text-amber-400" />
                <span>Worldwide Judicial Jurisdictions Directory</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Explore constitutional jurisprudence across 10 supreme courts and transnational tribunals.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {JURISDICTIONS_LIST.filter((j) => j !== 'All Jurisdictions').map((jur) => {
                const count = articles.filter((a) => a.jurisdiction === jur).length;
                return (
                  <div
                    key={jur}
                    onClick={() => {
                      setSelectedJurisdiction(jur);
                      setActiveTab('verdicts');
                    }}
                    className="p-5 rounded-xl bg-[#0b132b]/80 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer group shadow-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-400 group-hover:underline">
                        Explore
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                        {count} Precedents
                      </span>
                    </div>
                    <h3 className="font-serif-title text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                      {jur}
                    </h3>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Tab: Bookmarks */}
        {!loading && !error && activeTab === 'bookmarks' && (
          <div className="space-y-6">
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-serif-title text-2xl font-bold text-white flex items-center gap-2">
                  <BookMarked className="w-6 h-6 text-amber-400" />
                  <span>Saved Precedents & Briefs</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your personal library of bookmarked supreme court judgments and wire dispatches.
                </p>
              </div>
            </div>

            {bookmarks.length === 0 ? (
              <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400">
                <BookMarked className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm">You haven't bookmarked any legal verdicts yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookmarks.map((article) => (
                  <VerdictCard
                    key={article.id}
                    article={article}
                    onRead={(art) => setSelectedArticle(art)}
                    isBookmarked={true}
                    onToggleBookmark={handleToggleBookmark}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Article Full 12-Section Modal (Without Score on User side) */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          isBookmarked={bookmarks.some((b) => b.id === selectedArticle.id)}
          onToggleBookmark={handleToggleBookmark}
        />
      )}

      {/* Footer */}
      <Footer />

    </div>
  );
}
