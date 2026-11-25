import React from 'react';
import { Newspaper, Globe, ArrowRight, Clock, ShieldCheck, Bookmark, MapPin, Calendar } from 'lucide-react';

export default function NewsSection({
  newsArticles = [],
  onRead,
  bookmarks = [],
  onToggleBookmark,
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-red-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span>Worldwide Legal Wire & Court Dispatches</span>
          </div>
          <h2 className="font-serif-title text-2xl font-bold text-white">
            Breaking Judicial & Regulatory News
          </h2>
        </div>
        <span className="text-xs text-slate-400">
          Updated in real-time across global apex courts
        </span>
      </div>

      {newsArticles.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <Newspaper className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm">No breaking legal news found for current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {newsArticles.map((article) => {
            const displayCountry = article.country || article.jurisdiction || "Global";
            const displayRegion = article.region || (article.jurisdiction !== displayCountry ? article.jurisdiction : "Apex Jurisdiction");
            const displayDate = article.decision_date || (article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }) : "November 2026");

            return (
              <div
                key={article.id}
                className="p-5 rounded-xl bg-[#0b132b]/80 border border-slate-800 hover:border-red-500/40 transition-all flex flex-col justify-between group shadow-md"
              >
                <div className="space-y-3">
                  {/* Top Status & Date Row */}
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/60">
                    {/* Region with Country */}
                    <div className="flex items-center gap-1.5 text-red-300 font-medium min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="font-semibold text-slate-100 truncate">{displayCountry}</span>
                      <span className="text-red-500/80">•</span>
                      <span className="text-slate-400 text-[11px] truncate">{displayRegion}</span>
                    </div>

                    {/* Date with Calendar Icon */}
                    <div className="flex items-center gap-1.5 text-slate-200 font-mono text-[11px] shrink-0 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-800 shadow-sm">
                      <Calendar className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="font-medium text-slate-100">{displayDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/30 text-[10px] uppercase tracking-wider">
                      {article.jurisdiction}
                    </span>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <Clock className="w-3 h-3" />
                      <span>Live Dispatch</span>
                    </div>
                  </div>

                  <h3 
                    onClick={() => onRead(article)}
                    className="font-serif-title text-lg font-bold text-slate-100 group-hover:text-red-300 transition-colors cursor-pointer line-clamp-2"
                  >
                    {article.title}
                  </h3>

                  {article.key_holding && (
                    <p className="text-xs text-slate-300 font-serif-body line-clamp-3 leading-relaxed">
                      {article.key_holding}
                    </p>
                  )}

                  <div className="text-[11px] text-slate-400 pt-1">
                    <span>Court / Regulator: </span>
                    <span className="text-slate-200 font-medium">{article.court || "Judicial Authority"}</span>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => onToggleBookmark(article)}
                    className={`text-xs p-1.5 rounded-lg border ${
                      bookmarks.some(b => b.id === article.id)
                        ? "bg-amber-500 text-slate-950 border-amber-400"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                    title="Bookmark story"
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button
                    onClick={() => onRead(article)}
                    className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                  >
                    <span>Read Full Dispatch</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
