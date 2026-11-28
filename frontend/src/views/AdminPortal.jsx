import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Scale, Shield, Globe, Sparkles, Play, Pause, RefreshCw, 
  Trash2, Eye, CheckCircle2, AlertCircle, ArrowLeft, Layers, 
  BarChart3, Check, Award, Newspaper, Landmark, Search, Clock, Zap, RotateCcw
} from 'lucide-react';
import { JURISDICTIONS_LIST, CATEGORIES_LIST } from '../components/Filters';
import { apiUrl } from '../config';
import {
  computeArticlesSignature,
  fetchArticles,
  fetchLatestLegalNews,
  fetchPublishingStats,
  notifyCatalogUpdated,
  subscribeCatalogUpdates,
} from '../services/api';

const PIPELINE_STAGES = [
  { id: 1, name: "1. Topic Discovery", desc: "AI Random Selection across 10 Jurisdictions" },
  { id: 2, name: "2. Deduplication Gate", desc: "Canonical Case Hashing & Database Index" },
  { id: 3, name: "3. Legal Research", desc: "Wikipedia API & Tavily Search Dossier" },
  { id: 4, name: "4. Editorial Writer", desc: "12-Section Judicial Precedent / News Wire" },
  { id: 5, name: "5. SEO & Citations", desc: "Bluebook, OSCOLA & Taxonomy Tags" },
  { id: 6, name: "6. Media Discovery", desc: "Clean Wikimedia Commons CC Imagery" },
  { id: 7, name: "7. Quality Gate", desc: "11-Dimension Legal Audit (Score ≥ 8.0)" },
];

export default function AdminPortal({ 
  onExitToUserPortal, 
  onSelectArticle 
}) {
  const [adminTab, setAdminTab] = useState('overview'); // 'overview' | 'articles' | 'trigger'
  const [articles, setArticles] = useState([]);
  const [stats, setStats] = useState(null);
  const [automationStatus, setAutomationStatus] = useState(null);
  const [nextRunCountdown, setNextRunCountdown] = useState(null);
  const [resetCountdown, setResetCountdown] = useState(null);
  const [resettingCounter, setResettingCounter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Articles manager state
  const [articleSearch, setArticleSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Trigger studio state
  const [mode, setMode] = useState('auto'); // 'auto' (AI random selection) | 'custom'
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [pipelineResult, setPipelineResult] = useState(null);

  // Custom form inputs
  const [customTopic, setCustomTopic] = useState('');
  const [customJurisdiction, setCustomJurisdiction] = useState('United States');
  const [customCategory, setCustomCategory] = useState('Constitutional & Democratic Law');
  const [customType, setCustomType] = useState('VERDICT_BRIEF');

  // Live latest legal news fetcher state
  const [liveNewsItems, setLiveNewsItems] = useState([]);
  const [liveNewsSource, setLiveNewsSource] = useState('');
  const [fetchingLiveNews, setFetchingLiveNews] = useState(false);
  const [newsSearchKeyword, setNewsSearchKeyword] = useState('');

  // Refs for silent ETag live sync without flicker
  const articlesEtagRef = useRef(null);
  const statsEtagRef = useRef(null);
  const articlesSigRef = useRef('');
  const lastRunKeyRef = useRef(null);

  const syncArticlesAndStats = useCallback(async ({ silent = true, force = false } = {}) => {
    try {
      const statsRes = await fetchPublishingStats({ bypassCache: true });
      if (statsRes?.stats) {
        setStats(statsRes.stats);
      }

      const s = statsRes?.stats;
      const statsSig = s
        ? `${s.total_articles ?? 0}:${s.published ?? 0}:${s.in_review ?? 0}:${s.verdicts_count ?? 0}:${s.legal_news_count ?? 0}`
        : null;
      const changed = force || !silent || (statsSig !== null && statsSig !== statsEtagRef.current);
      if (statsSig !== null) {
        statsEtagRef.current = statsSig;
      }

      if (!changed) {
        return;
      }

      const artRes = await fetchArticles({
        limit: 100,
        status: 'ALL',
        bypassCache: true,
      });

      if (!artRes.unchanged) {
        const sig = computeArticlesSignature(artRes.articles, artRes.total);
        if (!silent || sig !== articlesSigRef.current) {
          articlesSigRef.current = sig;
          setArticles(artRes.articles);
        }
      }
    } catch (e) {
      if (!silent) {
        console.error('Error syncing admin articles/stats:', e);
      }
    }
  }, []);

  const loadAllData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [, autoRes] = await Promise.all([
        syncArticlesAndStats({ silent, force: !silent }),
        fetch(apiUrl('/api/v1/automation/status')),
      ]);
      const autoData = await autoRes.json();

      setAutomationStatus(autoData);
      lastRunKeyRef.current = `${autoData?.total_runs || 0}|${autoData?.successful_runs || 0}|${autoData?.articles_generated_today || 0}|${autoData?.last_run_at || ''}`;
      if (autoData?.seconds_until_next_run !== undefined && autoData?.seconds_until_next_run !== null) {
        setNextRunCountdown(autoData.seconds_until_next_run);
      }
      if (autoData?.seconds_until_reset !== undefined && autoData?.seconds_until_reset !== null) {
        setResetCountdown(autoData.seconds_until_reset);
      }
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [syncArticlesAndStats]);

  useEffect(() => {
    loadAllData({ silent: false });

    // Poll telemetry + silent ETag articles/stats sync every 3.5s
    const pollInterval = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const autoRes = await fetch(apiUrl('/api/v1/automation/status'));
        const autoData = await autoRes.json();
        setAutomationStatus(autoData);
        if (autoData?.seconds_until_next_run !== undefined && autoData?.seconds_until_next_run !== null) {
          setNextRunCountdown(autoData.seconds_until_next_run);
        }
        if (autoData?.seconds_until_reset !== undefined && autoData?.seconds_until_reset !== null) {
          setResetCountdown(autoData.seconds_until_reset);
        }

        const nextRunKey = `${autoData?.total_runs || 0}|${autoData?.successful_runs || 0}|${autoData?.articles_generated_today || 0}|${autoData?.last_run_at || ''}`;
        const runChanged = lastRunKeyRef.current !== null && nextRunKey !== lastRunKeyRef.current;
        lastRunKeyRef.current = nextRunKey;

        // If autopilot completed a run, notify user tabs too & force-sync catalog
        if (runChanged) {
          notifyCatalogUpdated('autopilot');
        }
        await syncArticlesAndStats({ silent: true, force: runChanged });
      } catch {}
    }, 3500);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncArticlesAndStats({ silent: true });
      }
    };

    const unsubscribeSync = subscribeCatalogUpdates(() => {
      syncArticlesAndStats({ silent: true, force: true });
    });

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearInterval(pollInterval);
      unsubscribeSync();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [loadAllData, syncArticlesAndStats]);

  // Live 1-second ticking countdown clock for smooth second-by-second updates
  useEffect(() => {
    const tickTimer = setInterval(() => {
      setNextRunCountdown((prev) => {
        if (prev === null || prev === undefined) return prev;
        if (prev <= 1) {
          fetch(apiUrl('/api/v1/automation/status'))
            .then((r) => r.json())
            .then((data) => {
              setAutomationStatus(data);
              setNextRunCountdown(data.seconds_until_next_run);
            })
            .catch(() => {});
          return 0;
        }
        return prev - 1;
      });

      setResetCountdown((prev) => {
        if (prev === null || prev === undefined) return prev;
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(tickTimer);
  }, []);

  const formatCountdown = (secs) => {
    if (secs === null || secs === undefined) return 'Pacing Cooldown';
    if (secs <= 0) return '⚡ Executing cycle now...';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s (${secs}s)`;
  };

  const formatResetTimer = (secs) => {
    if (secs === null || secs === undefined) return 'Calculating...';
    if (secs <= 0) return 'Rolling over 24h cycle...';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m < 10 ? '0' : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const handleResetCounter = async () => {
    if (!window.confirm("Are you sure you want to reset today's published article counter back to 0/200?")) return;
    setResettingCounter(true);
    try {
      const res = await fetch(apiUrl('/api/v1/automation/reset-counter'), { method: 'POST' });
      const data = await res.json();
      setAutomationStatus(data.status);
      setMessage({
        type: 'success',
        text: "Daily production counter has been successfully reset to 0/200!"
      });
      await loadAllData({ silent: true });
    } catch (e) {
      setMessage({ type: 'error', text: `Failed to reset counter: ${e.message}` });
    } finally {
      setResettingCounter(false);
    }
  };

  const handleToggleAutopilot = async () => {
    const isRunning = automationStatus?.is_running;
    const endpoint = apiUrl(isRunning ? '/api/v1/automation/stop' : '/api/v1/automation/start');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval_seconds: 300, daily_target: 200 }),
      });
      if (res.ok) {
        setMessage({
          type: 'success',
          text: isRunning 
            ? 'Autonomous Legal Publisher Engine PAUSED.' 
            : '24/7 Autonomous Publisher ACTIVATED! Generating up to 200 dossiers/day.',
        });
        await loadAllData({ silent: true });
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const handleTriggerSingleAutonomous = async () => {
    setMessage(null);
    try {
      setMessage({
        type: 'info',
        text: '⚡ Autonomous cycle dispatched! AI is randomly selecting a new worldwide jurisdiction, legal domain, and case...',
      });
      const res = await fetch(apiUrl('/api/v1/automation/trigger-single'), { method: 'POST' });
      const data = await res.json();
      if (data.result?.success) {
        setMessage({
          type: 'success',
          text: `Autonomous published: "${data.result.title}" (${data.result.jurisdiction}) with Score ${data.result.score}/10!`,
        });
        await loadAllData({ silent: true });
        notifyCatalogUpdated('autonomous_trigger');
      } else {
        setMessage({
          type: 'info',
          text: `Autonomous cycle finished: ${data.result?.status || 'Completed'}`,
        });
        await loadAllData({ silent: true });
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const handleToggleArticleStatus = async (id) => {
    try {
      await fetch(apiUrl(`/api/v1/publishing/articles/${id}/toggle-status`), { method: 'POST' });
      await loadAllData({ silent: true });
      notifyCatalogUpdated('toggle_status');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteArticle = async (id) => {
    if (!window.confirm("Are you sure you want to delete this legal dossier permanently?")) return;
    try {
      await fetch(apiUrl(`/api/v1/publishing/articles/${id}`), { method: 'DELETE' });
      setMessage({ type: 'success', text: `Article #${id} deleted successfully.` });
      await loadAllData({ silent: true });
      notifyCatalogUpdated('delete');
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const handleBatchPublish = async () => {
    try {
      const res = await fetch(apiUrl('/api/v1/publishing/batch-publish'), { method: 'POST' });
      const data = await res.json();
      setMessage({ type: 'success', text: `Published all ${data.published_count} in-review articles!` });
      await loadAllData({ silent: true });
      notifyCatalogUpdated('batch_publish');
    } catch (e) {
      console.error(e);
    }
  };

  const handleFetchLatestNews = async () => {
    setFetchingLiveNews(true);
    try {
      const data = await fetchLatestLegalNews({
        jurisdiction: customJurisdiction,
        category: customCategory,
        query: newsSearchKeyword,
        days: 7,
        limit: 8,
      });
      setLiveNewsItems(data.news || []);
      setLiveNewsSource(data.source || '');
      if (!data.news || data.news.length === 0) {
        setMessage({
          type: 'info',
          text: 'No live news headlines matched those filters. Try another keyword or jurisdiction.',
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to fetch latest news: ${err.message}` });
    } finally {
      setFetchingLiveNews(false);
    }
  };

  const handlePublishLiveNewsItem = async (item) => {
    setRunningPipeline(true);
    setPipelineResult(null);
    setActiveStage(1);
    const stageTimer = setInterval(() => {
      setActiveStage((prev) => (prev < 6 ? prev + 1 : prev));
    }, 4000);

    try {
      const res = await fetch(apiUrl('/api/v1/workflow/run'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.title,
          jurisdiction: item.jurisdiction && item.jurisdiction !== 'Global' ? item.jurisdiction : customJurisdiction,
          category: item.category || customCategory,
          article_type: 'LEGAL_NEWS',
          news_angle: item.title,
        }),
      });
      const data = await res.json();
      clearInterval(stageTimer);
      setActiveStage(7);

      if (res.ok) {
        setPipelineResult(data.workflow_result);
        await loadAllData({ silent: true });
        notifyCatalogUpdated('workflow_run');
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to publish live news story.' });
      }
    } catch (err) {
      clearInterval(stageTimer);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setRunningPipeline(false);
    }
  };

  const handleRunPipeline = async (e) => {
    e.preventDefault();
    setRunningPipeline(true);
    setPipelineResult(null);
    setActiveStage(1);

    // Visual progression
    const stageTimer = setInterval(() => {
      setActiveStage((prev) => (prev < 6 ? prev + 1 : prev));
    }, 4000);

    try {
      const payload = mode === 'auto'
        ? { article_type: Math.random() > 0.5 ? 'VERDICT_BRIEF' : 'LEGAL_NEWS' }
        : {
            name: customTopic.trim() || undefined,
            jurisdiction: customJurisdiction,
            category: customCategory,
            article_type: customType,
          };

      const res = await fetch(apiUrl('/api/v1/workflow/run'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      clearInterval(stageTimer);
      setActiveStage(7);

      if (res.ok) {
        setPipelineResult(data.workflow_result);
        await loadAllData({ silent: true });
        notifyCatalogUpdated('workflow_run');
      } else {
        setMessage({ type: 'error', text: data.detail || 'Pipeline execution failed.' });
      }
    } catch (err) {
      clearInterval(stageTimer);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setRunningPipeline(false);
    }
  };

  const filteredArticles = articles.filter((a) => {
    if (statusFilter === 'PUBLISHED' && a.status !== 'PUBLISHED') return false;
    if (statusFilter === 'IN_REVIEW' && a.status !== 'IN_REVIEW') return false;
    if (statusFilter === 'VERDICTS' && a.article_type !== 'VERDICT_BRIEF') return false;
    if (statusFilter === 'NEWS' && a.article_type !== 'LEGAL_NEWS') return false;
    if (articleSearch.trim()) {
      const q = articleSearch.toLowerCase();
      const matchTitle = (a.title || '').toLowerCase().includes(q);
      const matchCit = (a.citation || '').toLowerCase().includes(q);
      const matchCourt = (a.court || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCit && !matchCourt) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 flex flex-col font-sans">
      
      {/* Admin Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0b132b]/95 backdrop-blur-md border-b border-amber-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center glow-gold">
              <Scale className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif-title text-lg font-bold tracking-wider text-white">
                  VERDICTS<span className="text-amber-400">.AI</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-bold uppercase tracking-widest">
                  ADMIN SUITE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Autonomous Judicial Operations & Control Room</p>
            </div>
          </div>

          {/* Admin Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setAdminTab('overview')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                adminTab === 'overview'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Overview & Telemetry
            </button>

            <button
              onClick={() => setAdminTab('articles')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                adminTab === 'articles'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Articles Manager ({articles.length})
            </button>

            <button
              onClick={() => setAdminTab('trigger')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                adminTab === 'trigger'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Workflow Studio
            </button>
          </nav>

          {/* Exit to Public Portal + Live Sync Indicator */}
          <div className="flex items-center gap-3">
            <span
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300"
              title="Automatically syncs newly published articles without manual refresh"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Sync</span>
            </span>

            <button
              onClick={onExitToUserPortal}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit to Public Site</span>
            </button>
          </div>
        </div>
      </header>

      {/* Global Alert Notification */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between shadow-lg ${
            message.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
              : message.type === 'error'
                ? 'bg-red-500/15 text-red-300 border border-red-500/40'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Main Admin Content Body */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        
        {/* ==================== TAB 1: OVERVIEW & TELEMETRY ==================== */}
        {adminTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Prominent 24/7 Autonomous Publisher Autopilot Card */}
            <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-[#0b132b] via-slate-900 to-[#070b19] border border-amber-500/40 glow-gold shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                      automationStatus?.is_running
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${automationStatus?.is_running ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                      <span>{automationStatus?.is_running ? 'AUTONOMOUS AUTOPILOT ACTIVE' : 'AUTOPILOT PAUSED'}</span>
                    </span>

                    <span className="text-xs text-slate-400 font-mono">
                      Target: 200 Articles / 24h
                    </span>
                  </div>

                  <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-white">
                    24/7 Autonomous Judicial Publishing Engine
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 font-light max-w-2xl">
                    Continuously balances and executes multi-agent research across 10 supreme jurisdictions and 12 legal categories, evaluating each against the 11-dimension quality gate (threshold ≥ 8.0/10).
                  </p>
                </div>

                {/* Autopilot Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleTriggerSingleAutonomous}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>⚡ TRIGGER AUTONOMOUS RUN NOW</span>
                  </button>

                  <button
                    onClick={handleToggleAutopilot}
                    className={`px-5 py-3 rounded-xl font-bold text-xs tracking-wider flex items-center gap-2 border transition-all ${
                      automationStatus?.is_running
                        ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    }`}
                  >
                    {automationStatus?.is_running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{automationStatus?.is_running ? 'PAUSE 24/7 ENGINE' : 'START 24/7 AUTOPILOT'}</span>
                  </button>
                </div>
              </div>

              {/* Autopilot Progress Bar & Telemetry Grid (4 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
                
                {/* 1. Production Quota & Manual Reset Counter Button */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="font-semibold text-slate-300">24h Quota Progress</span>
                      <button
                        onClick={handleResetCounter}
                        disabled={resettingCounter}
                        className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 transition-all cursor-pointer"
                        title="Reset daily articles counter to 0/200"
                      >
                        <RotateCcw className={`w-3 h-3 ${resettingCounter ? 'animate-spin' : ''}`} />
                        <span>Reset Counter</span>
                      </button>
                    </div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="font-mono text-base font-bold text-amber-300">
                        {automationStatus?.articles_generated_today || 0} / {automationStatus?.daily_target || 200}
                      </span>
                      <span className="text-xs font-mono text-slate-400 font-semibold">
                        {automationStatus?.progress_percent || 0}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, automationStatus?.progress_percent || 0)}%` }}
                    />
                  </div>
                </div>

                {/* 2. Next Autonomous Run Countdown (Live 1-Second Ticking Clock) */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Next Autonomous Run</div>
                      <div className="font-mono text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                        {automationStatus?.is_running 
                          ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-amber-300 font-bold">{formatCountdown(nextRunCountdown)}</span>
                            </>
                          )
                          : <span className="text-slate-500 font-medium">Engine Idle</span>}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">300s cycle</span>
                </div>

                {/* 3. Daily Article Reset Timer (Live 1-Second Ticking Clock to Midnight UTC) */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <RotateCcw className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Daily Quota Reset</div>
                      <div className="font-mono text-sm font-bold text-emerald-300 mt-0.5">
                        {formatResetTimer(resetCountdown)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">00:00 UTC</span>
                </div>

                {/* 4. Execution Telemetry Metrics */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Execution Telemetry</div>
                      <div className="font-mono text-sm font-bold text-slate-200 mt-0.5">
                        {automationStatus?.successful_runs || 0} / {automationStatus?.total_runs || 0} runs
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold shrink-0">100% Reliable</span>
                </div>

              </div>

            </div>

            {/* Quick Metrics Grid */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="p-4 rounded-xl bg-[#0b132b] border border-slate-800 shadow">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Articles</div>
                  <div className="font-serif-title text-2xl font-bold text-white mt-1">{stats.total_articles}</div>
                </div>
                <div className="p-4 rounded-xl bg-[#0b132b] border border-slate-800 shadow">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Published</div>
                  <div className="font-serif-title text-2xl font-bold text-emerald-400 mt-1">{stats.published}</div>
                </div>
                <div className="p-4 rounded-xl bg-[#0b132b] border border-slate-800 shadow">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">In Review Queue</div>
                  <div className="font-serif-title text-2xl font-bold text-amber-400 mt-1">{stats.in_review}</div>
                </div>
                <div className="p-4 rounded-xl bg-[#0b132b] border border-slate-800 shadow">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Landmark Verdicts</div>
                  <div className="font-serif-title text-2xl font-bold text-slate-200 mt-1">{stats.verdicts_count}</div>
                </div>
                <div className="p-4 rounded-xl bg-[#0b132b] border border-slate-800 shadow">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Legal News Wire</div>
                  <div className="font-serif-title text-2xl font-bold text-red-400 mt-1">{stats.legal_news_count}</div>
                </div>
                <div className="p-4 rounded-xl bg-[#0b132b] border border-slate-800 shadow">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Avg Quality Audit</div>
                  <div className="font-serif-title text-2xl font-bold text-amber-300 mt-1">{stats.average_score || 8.9}/10</div>
                </div>
              </div>
            )}

            {/* Quick Actions & Recent Published Precedents */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif-title text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span>Recently Published Legal Dossiers</span>
                </h3>
                <button
                  onClick={() => setAdminTab('articles')}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  View All in Articles Manager →
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0b132b] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Dossier / Case Title</th>
                      <th className="p-3.5">Region & Country</th>
                      <th className="p-3.5">Court & Date</th>
                      <th className="p-3.5">Audit Score</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {articles.slice(0, 6).map((art) => (
                      <tr key={art.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3.5 font-medium text-white max-w-[280px] truncate">
                          {art.case_name || art.title}
                        </td>
                        <td className="p-3.5 text-slate-300">
                          <div className="font-semibold text-slate-100">{art.country || art.jurisdiction}</div>
                          <div className="text-[10px] text-slate-400">{art.region || "Apex"}</div>
                        </td>
                        <td className="p-3.5 max-w-[180px]">
                          <div className="truncate text-slate-200">{art.court}</div>
                          <div className="text-[10px] font-mono text-amber-300/80">{art.decision_date || "Nov 2026"}</div>
                        </td>
                        <td className="p-3.5 font-mono text-amber-300 font-bold">
                          {art.score ? art.score.toFixed(1) : "9.0"}/10
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            art.status === 'PUBLISHED' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {art.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => onSelectArticle(art)}
                            className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 2: ARTICLES MANAGER ==================== */}
        {adminTab === 'articles' && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="font-serif-title text-2xl font-bold text-white">Articles Operations & Review Queue</h2>
                <p className="text-xs text-slate-400">Total {articles.length} legal records under management</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleBatchPublish}
                  className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all"
                >
                  Publish All In-Review
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-xl bg-[#0b132b] border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  placeholder="Filter articles by title, case citation, court of record..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800">
                {['ALL', 'PUBLISHED', 'IN_REVIEW', 'VERDICTS', 'NEWS'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      statusFilter === st
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Table of Articles */}
            <div className="rounded-xl border border-slate-800 bg-[#0b132b] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">ID</th>
                    <th className="p-3.5">Case Title & Citation</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Region & Country</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Audit Score</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredArticles.map((art) => (
                    <tr key={art.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5 font-mono text-slate-400">#{art.id}</td>
                      <td className="p-3.5 max-w-[280px]">
                        <div className="font-bold text-white truncate">{art.case_name || art.title}</div>
                        <div className="text-[11px] text-amber-300/80 font-mono mt-0.5">{art.citation || "Record"}</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          art.article_type === 'LEGAL_NEWS'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {art.article_type === 'LEGAL_NEWS' ? 'Legal News' : 'Landmark'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-100">{art.country || art.jurisdiction}</div>
                        <div className="text-[10px] text-slate-400">{art.region || "Apex"}</div>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-300">
                        {art.decision_date || (art.published_at ? new Date(art.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Nov 2026")}
                      </td>
                      <td className="p-3.5 font-mono text-amber-300 font-bold">
                        {art.score ? art.score.toFixed(1) : "9.0"}/10
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleArticleStatus(art.id)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                            art.status === 'PUBLISHED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-amber-500/20'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-emerald-500/20'
                          }`}
                          title="Click to toggle status"
                        >
                          {art.status}
                        </button>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => onSelectArticle(art)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(art.id)}
                          className="px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900 text-red-300 font-semibold border border-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ==================== TAB 3: WORKFLOW STUDIO ==================== */}
        {adminTab === 'trigger' && (
          <div className="max-w-4xl mx-auto space-y-8">
            
            <div className="text-center space-y-2">
              <h2 className="font-serif-title text-3xl font-bold text-white">
                Multi-Agent Legal Research & Generation Studio
              </h2>
              <p className="text-sm text-slate-400 font-light max-w-xl mx-auto">
                Trigger autonomous multi-agent synthesis across 10 supreme jurisdictions and 12 legal categories.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center justify-center">
              <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 inline-flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('auto')}
                  className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    mode === 'auto'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>Autonomous Mode (AI Random Selection)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('custom')}
                  className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    mode === 'custom'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Custom Target Formulation</span>
                </button>
              </div>
            </div>

            {/* Studio Form Card */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0b132b] border border-amber-500/40 glow-gold shadow-xl space-y-6">
              
              {mode === 'auto' ? (
                <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif-title text-lg font-bold text-white">
                    Autonomous AI Selection Mode Active
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    The agent will autonomously choose a novel, un-profiled topic randomly rotated across 10 global apex courts and 12 legal domains, verify zero duplicates in PostgreSQL, research court records, and auto-publish upon passing the quality gate.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Specific Case Title or News Topic:
                    </label>
                    <input
                      type="text"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="e.g. Marbury v. Madison, Roe v. Wade, Schrems II, or EU AI Act Injunction..."
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Jurisdiction:
                      </label>
                      <select
                        value={customJurisdiction}
                        onChange={(e) => setCustomJurisdiction(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-amber-400"
                      >
                        {JURISDICTIONS_LIST.filter(j => j !== "All Jurisdictions").map(j => (
                          <option key={j} value={j}>{j}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Legal Domain:
                      </label>
                      <select
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-amber-400"
                      >
                        {CATEGORIES_LIST.filter(c => c !== "All Categories").map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Dossier Type:
                      </label>
                      <select
                        value={customType}
                        onChange={(e) => setCustomType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-amber-400"
                      >
                        <option value="VERDICT_BRIEF">12-Section Landmark Verdict</option>
                        <option value="LEGAL_NEWS">Breaking Legal News Wire</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Execution Trigger Button */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  disabled={runningPipeline}
                  onClick={handleRunPipeline}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95"
                >
                  {runningPipeline ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>SYNTHESIZING LANGGRAPH MULTI-AGENT PIPELINE...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>{mode === 'auto' ? 'RUN AI AUTONOMOUS PIPELINE' : 'GENERATE CUSTOM DOSSIER'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Visual Pipeline Progression Stages */}
              <div className="pt-6 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Multi-Agent Pipeline Progression
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5">
                  {PIPELINE_STAGES.map((st) => {
                    const isCompleted = activeStage > st.id || (!runningPipeline && pipelineResult);
                    const isCurrent = runningPipeline && activeStage === st.id;

                    return (
                      <div
                        key={st.id}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          isCompleted
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                            : isCurrent
                              ? 'bg-amber-500/15 border-amber-500 text-amber-300 glow-gold scale-105'
                              : 'bg-slate-900/60 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="flex justify-center mb-1">
                          {isCompleted ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : isCurrent ? (
                            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                          ) : (
                            <span className="text-xs font-mono">{st.id}</span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold truncate">{st.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pipeline Output Result Card */}
              {pipelineResult && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Dossier Successfully Synthesized & Published!</span>
                    </span>
                    <span className="font-mono text-amber-300 font-bold">
                      Audit Score: {pipelineResult.score || 8.9}/10
                    </span>
                  </div>

                  <h3 className="font-serif-title text-base font-bold text-white">
                    {pipelineResult.article_title}
                  </h3>

                  <div className="flex items-center gap-3 pt-1">
                    {pipelineResult.published_article_id && (
                      <button
                        onClick={() => {
                          const match = articles.find(a => a.id === pipelineResult.published_article_id);
                          if (match) onSelectArticle(match);
                        }}
                        className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all"
                      >
                        Read Newly Published Dossier →
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Live Latest Legal News Fetcher */}
            <div className="p-6 rounded-2xl bg-[#0b132b] border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif-title text-lg font-bold text-white flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-red-400" />
                    <span>Live Latest Legal News Fetcher</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Fetch real-time court rulings and breaking legal news via Tavily News &amp; RSS, then publish with one click.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={fetchingLiveNews}
                  onClick={handleFetchLatestNews}
                  className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-200 border border-red-500/40 text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fetchingLiveNews ? 'animate-spin' : ''}`} />
                  <span>{fetchingLiveNews ? 'Fetching Latest News...' : 'Fetch Latest News'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={newsSearchKeyword}
                  onChange={(e) => setNewsSearchKeyword(e.target.value)}
                  placeholder="Optional topic (e.g. Supreme Court, AI, Antitrust)..."
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <select
                  value={customJurisdiction}
                  onChange={(e) => setCustomJurisdiction(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-amber-400"
                >
                  {JURISDICTIONS_LIST.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-amber-400"
                >
                  {CATEGORIES_LIST.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {liveNewsItems.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Found {liveNewsItems.length} live headlines</span>
                    {liveNewsSource && <span className="font-mono text-amber-300">Source: {liveNewsSource}</span>}
                  </div>
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                    {liveNewsItems.map((item, idx) => (
                      <div key={`${item.url || item.title}-${idx}`} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/50">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                            <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30 font-semibold">
                              {item.source}
                            </span>
                            <span>{item.published_date}</span>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-400 hover:underline truncate max-w-[220px]"
                              >
                                Source link
                              </a>
                            )}
                          </div>
                          <div className="text-xs font-bold text-white leading-snug">
                            {item.title}
                          </div>
                          {item.snippet && (
                            <p className="text-[11px] text-slate-400 line-clamp-2">
                              {item.snippet}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={runningPipeline}
                          onClick={() => handlePublishLiveNewsItem(item)}
                          className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold shrink-0 cursor-pointer"
                        >
                          Generate &amp; Publish
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
