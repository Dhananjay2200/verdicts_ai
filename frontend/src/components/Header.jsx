import React, { useState, useEffect } from 'react';
import { Scale, Gavel, Globe, Bookmark, Newspaper, Shield, ShieldAlert, Cpu } from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  bookmarksCount, 
  onOpenAdmin,
  newsTicker = [] 
}) {
  const [currentTickerIdx, setCurrentTickerIdx] = useState(0);

  useEffect(() => {
    if (newsTicker.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentTickerIdx(prev => (prev + 1) % newsTicker.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [newsTicker]);

  const currentNews = newsTicker[currentTickerIdx] || {
    title: "Supreme courts worldwide establish digital privacy and procedural safeguards",
    jurisdiction: "Global"
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070b19]/90 backdrop-blur-md border-b border-slate-800/80">
      {/* Worldwide Legal News Wire Ticker */}
      <div className="bg-[#0b132b] border-b border-[#1e293b] text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="font-semibold text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Gavel className="w-3 h-3" /> Worldwide Legal Wire
            </span>
          </div>
          
          <div className="overflow-hidden whitespace-nowrap flex-1 text-slate-300 flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] font-medium border border-slate-700">
              {currentNews.jurisdiction || "Global"}
            </span>
            <span className="truncate hover:text-white transition-colors cursor-pointer">
              {currentNews.title}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-slate-400 text-[11px] shrink-0">
            <span>Apex Courts • International Wire</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Emblem & Logo */}
        <div 
          onClick={() => setActiveTab('verdicts')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-amber-600/10 border border-amber-500/40 flex items-center justify-center glow-gold group-hover:border-amber-400 transition-all">
            <Scale className="w-6 h-6 text-amber-400 group-hover:scale-105 transition-transform" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif-title text-xl font-bold tracking-wider text-slate-100 group-hover:text-amber-300 transition-colors">
                VERDICTS<span className="text-amber-400">.AI</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                LEXICON
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-tight">
              Global Judicial Precedents & Legal Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setActiveTab('verdicts')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'verdicts'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Scale className="w-4 h-4" />
            Landmark Verdicts
          </button>

          <button
            onClick={() => setActiveTab('news')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'news'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            Worldwide Legal News
          </button>

          <button
            onClick={() => setActiveTab('jurisdictions')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'jurisdictions'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-4 h-4" />
            Jurisdictions
          </button>

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'bookmarks'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            Saved Precedents
            {bookmarksCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500 text-slate-950 font-bold">
                {bookmarksCount}
              </span>
            )}
          </button>
        </nav>

        {/* Action Button: Enter Admin Portal */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAdmin}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Shield className="w-3.5 h-3.5 fill-current" />
            <span>ADMIN PORTAL</span>
          </button>
        </div>
      </div>
    </header>
  );
}
