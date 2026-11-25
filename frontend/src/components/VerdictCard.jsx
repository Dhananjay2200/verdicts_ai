import React from 'react';
import { Bookmark, ArrowRight, Eye, Newspaper, Landmark, MapPin, Calendar } from 'lucide-react';

export default function VerdictCard({
  article,
  onRead,
  isBookmarked,
  onToggleBookmark,
}) {
  const isNews = article.article_type === "LEGAL_NEWS";

  // Format date helper
  const displayDate = article.decision_date || (article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : "November 2026");

  // Format country & region
  const displayCountry = article.country || article.jurisdiction || "Global";
  const displayRegion = article.region || (article.jurisdiction !== displayCountry ? article.jurisdiction : "Apex Jurisdiction");

  return (
    <div className="rounded-xl bg-[#0b132b]/90 border border-slate-800 hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between overflow-hidden group shadow-lg hover:shadow-amber-500/10">
      <div>
        {/* Card Header & Lead Thumbnail */}
        {article.primary_image_url && (
          <div className="relative h-44 w-full overflow-hidden bg-slate-950">
            <img
              src={article.primary_image_url}
              alt={article.image_caption || article.title}
              title={article.image_caption || article.court || article.jurisdiction}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-95"
              onError={(e) => {
                e.target.src = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b132b] via-[#0b132b]/40 to-transparent" />
            
            {/* Top Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border flex items-center gap-1 ${
                isNews 
                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40"
              }`}>
                {isNews ? <Newspaper className="w-3 h-3" /> : <Landmark className="w-3 h-3" />}
                {isNews ? "Legal News" : "Landmark Precedent"}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(article);
                }}
                className={`p-1.5 rounded-lg backdrop-blur-md transition-all ${
                  isBookmarked
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-900/80 text-slate-300 hover:text-white"
                }`}
                title={isBookmarked ? "Remove bookmark" : "Save precedent"}
              >
                <Bookmark className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>

            {/* Bottom on-image info: Citation & Region */}
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-mono bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 text-amber-300">
                {article.citation || "Judicial Record"}
              </span>
              <span className="bg-slate-950/85 px-2.5 py-0.5 rounded border border-slate-800 text-slate-200 font-medium flex items-center gap-1.5 shadow-sm">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span className="font-semibold text-white">{displayCountry}</span>
                <span className="text-amber-400/70">•</span>
                <span className="text-slate-300 text-[10px]">{displayRegion}</span>
              </span>
            </div>
          </div>
        )}

        <div className="p-5 space-y-3">
          {/* Geographic Region & Date Row */}
          <div className="flex items-center justify-between gap-2 text-xs pb-2 border-b border-slate-800/60">
            {/* Region with Country */}
            <div className="flex items-center gap-1.5 text-amber-300 font-medium min-w-0">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-semibold text-slate-100 truncate">{displayCountry}</span>
              <span className="text-amber-500/80">•</span>
              <span className="text-slate-400 text-[11px] truncate">{displayRegion}</span>
            </div>

            {/* Date with Calendar Icon */}
            <div className="flex items-center gap-1.5 text-slate-200 font-mono text-[11px] shrink-0 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-800 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-medium text-slate-100">{displayDate}</span>
            </div>
          </div>

          {/* Court of Record */}
          <div className="text-xs text-slate-400 font-medium truncate">
            {article.court || "Apex Court of Record"}
          </div>

          {/* Title */}
          <h3 
            onClick={() => onRead(article)}
            className="font-serif-title text-lg font-bold text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-2 cursor-pointer leading-snug"
          >
            {article.case_name || article.title}
          </h3>

          {/* Holding Quote Callout */}
          {article.key_holding && (
            <div className="p-2.5 rounded bg-slate-950/70 border-l-2 border-amber-500 text-xs text-slate-300 font-serif-body italic line-clamp-2">
              "{article.key_holding}"
            </div>
          )}

          {/* Metadata pill row */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
              {article.category}
            </span>
            {article.vote_split && (
              <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300/90 border border-slate-800 font-mono">
                {article.vote_split}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer Action */}
      <div className="p-5 pt-0 mt-2 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1 text-slate-400 text-xs">
          <Eye className="w-3.5 h-3.5" />
          <span>{article.view_count || 1} reads</span>
        </div>

        <button
          onClick={() => onRead(article)}
          className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 py-1 px-2.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all"
        >
          <span>Read Dossier</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
