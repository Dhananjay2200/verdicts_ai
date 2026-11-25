import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  X, Copy, Check, Scale, Bookmark, Printer, Landmark, Globe, MapPin, Calendar 
} from 'lucide-react';

export default function ArticleModal({ 
  article, 
  onClose, 
  isBookmarked, 
  onToggleBookmark 
}) {
  const [copiedCitation, setCopiedCitation] = useState(false);

  if (!article) return null;

  const displayCountry = article.country || article.jurisdiction || "Global";
  const displayRegion = article.region || (article.jurisdiction !== displayCountry ? article.jurisdiction : "Apex Jurisdiction");
  const displayDate = article.decision_date || (article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : "November 2026");

  const handleCopyCitation = () => {
    const citationText = `${article.case_name || article.title}, ${article.citation || ""} (${article.court || "Supreme Court"}).`;
    navigator.clipboard.writeText(citationText);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#070b19] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Sticky Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0b132b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Scale className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                {article.article_type === "LEGAL_NEWS" ? "Legal Wire Dispatch" : "12-Section Judicial Dossier"}
              </span>
              <div className="text-xs text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                <span>{article.citation || "Judicial Archive"}</span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-amber-300">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>{displayCountry} ({displayRegion})</span>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  <span>{displayDate}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCitation}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400/60 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all"
              title="Copy official Bluebook citation"
            >
              {copiedCitation ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCitation ? "Copied" : "Copy Citation"}</span>
            </button>

            <button
              onClick={() => onToggleBookmark(article)}
              className={`p-2 rounded-lg border transition-all ${
                isBookmarked 
                  ? "bg-amber-500 text-slate-950 border-amber-400" 
                  : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
              }`}
              title="Save to bookmarks"
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hidden sm:flex"
              title="Print legal dossier"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto p-5 sm:p-8 space-y-6">
          
          {/* Case Header Dossier Card */}
          <div className="rounded-xl p-5 bg-gradient-to-br from-slate-900/90 via-[#0b132b] to-slate-950 border border-slate-800 space-y-4">
            <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {article.title}
            </h1>

            {/* Judicial Matrix Grid (User-facing - no internal score) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Presiding Court</span>
                <div className="font-medium text-slate-200 truncate mt-0.5">{article.court || "Apex Court"}</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Official Citation</span>
                <div className="font-mono text-amber-300 font-semibold truncate mt-0.5">{article.citation || "Index Rep."}</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Region & Country</span>
                <div className="font-medium text-amber-300 truncate mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{displayCountry} ({displayRegion})</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Decision Date</span>
                <div className="font-mono text-slate-200 font-semibold truncate mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{displayDate}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Jurisdiction</span>
                <div className="font-medium text-slate-200 truncate mt-0.5">{article.jurisdiction || "Global"}</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Bench Decision Split</span>
                <div className="font-mono text-amber-300 font-medium truncate mt-0.5">{article.vote_split || "Majority Consensus"}</div>
              </div>
            </div>

            {/* Key Holding Highlight */}
            {article.key_holding && (
              <div className="p-3.5 rounded-lg bg-amber-500/10 border-l-4 border-amber-500 text-sm text-slate-200 font-serif-body italic">
                <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider not-italic mb-1">
                  Binding Ratio Decidendi
                </div>
                "{article.key_holding}"
              </div>
            )}
          </div>

          {/* Lead Image (Clean, No Photo: ... line, No HTML tags) */}
          {article.primary_image_url && (
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-lg">
              <img
                src={article.primary_image_url}
                alt={article.image_caption || article.title}
                className="w-full max-h-[460px] object-cover"
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop";
                }}
              />
              {article.image_caption && (
                <div className="px-3.5 py-2 text-xs text-slate-400 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
                  <span className="font-medium text-slate-300">{article.image_caption}</span>
                  <span className="text-[11px] text-amber-400/80 uppercase tracking-wider font-semibold">{article.country || article.jurisdiction}</span>
                </div>
              )}
            </div>
          )}

          {/* Full Markdown Article Content */}
          <div className="prose-legal text-slate-200">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {article.content}
            </ReactMarkdown>
          </div>

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0b132b] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div>
            <span>Official Judicial Archive ID: #{article.id} • {article.jurisdiction}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
}
