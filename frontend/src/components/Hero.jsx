import React from 'react';
import { Scale, BookOpen, Globe2, Award, Landmark, ArrowRight, Shield, MapPin, Calendar } from 'lucide-react';

export default function Hero({ onExploreClick, featuredVerdict, onReadVerdict }) {
  const displayCountry = featuredVerdict?.country || featuredVerdict?.jurisdiction || "Global";
  const displayRegion = featuredVerdict?.region || "Apex Jurisdiction";
  const displayDate = featuredVerdict?.decision_date || (featuredVerdict?.published_at ? new Date(featuredVerdict.published_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : "November 2026");

  return (
    <div className="relative overflow-hidden pt-8 pb-12 border-b border-slate-800/60 bg-gradient-to-b from-[#0a1128] via-[#070b19] to-[#070b19]">
      {/* Background judicial ambiance */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-80 bg-amber-500/5 blur-[120px] pointer-events-none rounded-full" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Main Hero Copy */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium tracking-wide">
              <Landmark className="w-3.5 h-3.5" />
              <span>The Autonomous Judicial & Legal Intelligence Engine</span>
            </div>

            <h1 className="font-serif-title text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-[1.15]">
              The Living Lexicon of <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100">
                Global Judicial Precedent
              </span>
            </h1>

            <p className="font-serif-body text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl font-light">
              Autonomous multi-agent synthesis delivering 12-section authoritative breakdowns for landmark supreme court verdicts, constitutional precedents, and worldwide legal news across 10 global jurisdictions.
            </p>

            {/* Platform Feature Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
                <Globe2 className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">10 Apex Jurisdictions</div>
                  <div className="text-[10px] text-slate-400">US, EU, UK, India, ICJ & more</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">Constitutional Review</div>
                  <div className="text-[10px] text-slate-400">Verified ratio decidendi</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">12-Section Dossiers</div>
                  <div className="text-[10px] text-slate-400">Statutory tables & dissents</div>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onExploreClick}
                className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02]"
              >
                <span>Explore Landmark Verdicts</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Featured Spotlight Case Card */}
          <div className="lg:col-span-5">
            {featuredVerdict ? (
              <div className="rounded-xl p-5 bg-gradient-to-b from-slate-900/90 to-slate-950 border border-amber-500/30 glow-gold relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px] font-semibold uppercase tracking-wider border border-amber-500/40">
                    <Award className="w-3 h-3 text-amber-400" />
                    <span>Featured Landmark Ruling</span>
                  </div>
                  {/* Region with Country pill */}
                  <span className="text-xs font-mono text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    <span>{displayCountry}</span>
                  </span>
                </div>

                <h3 className="font-serif-title text-xl font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 mb-2">
                  {featuredVerdict.case_name || featuredVerdict.title}
                </h3>

                {/* Country, Region & Date Row */}
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                  <span className="font-mono text-amber-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                    {featuredVerdict.citation || "Landmark Citation"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    <span>{displayDate}</span>
                  </span>
                  <span>•</span>
                  <span className="text-slate-400 truncate">{displayRegion}</span>
                </div>

                {featuredVerdict.key_holding && (
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-serif-body italic line-clamp-3 mb-4">
                    "{featuredVerdict.key_holding}"
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] text-slate-400">
                    <span>Court: </span>
                    <span className="text-slate-200 font-medium">{featuredVerdict.court || "Apex Court"}</span>
                  </div>

                  <button
                    onClick={() => onReadVerdict(featuredVerdict)}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                  >
                    <span>Read Full Case Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-8 bg-slate-900/60 border border-slate-800 text-center">
                <Scale className="w-10 h-10 text-amber-400/60 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-slate-300">Loading Judicial Archives...</h4>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
