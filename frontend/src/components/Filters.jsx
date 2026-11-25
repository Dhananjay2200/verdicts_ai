import React from 'react';
import { Search, Filter, X, Globe, BookMarked, Landmark, Calendar } from 'lucide-react';

export const JURISDICTIONS_LIST = [
  "All Jurisdictions",
  "United States",
  "European Union",
  "United Kingdom & Commonwealth",
  "India & South Asia",
  "International Courts & ICJ",
  "Canada",
  "Australia & New Zealand",
  "Latin America",
  "East Asia",
  "Africa & Regional Courts",
];

export const CATEGORIES_LIST = [
  "All Categories",
  "Constitutional & Democratic Law",
  "Tech, AI & Digital Privacy",
  "Antitrust, Monopolies & Competition",
  "Human Rights & Civil Liberties",
  "Environmental & Climate Justice",
  "Corporate, Securities & Financial Regulation",
  "Criminal Justice & Due Process",
  "Intellectual Property & Patent Law",
  "International Sovereignty & Arbitration",
  "Labor & Employment Rights",
  "Healthcare & Bioethics",
  "Free Speech, Defamation & Media Law",
];

export const DEFAULT_YEARS_LIST = [
  "All Years",
  "2026",
  "2024",
  "2021",
  "2020",
  "2019",
  "2017",
  "2001",
  "1995",
  "1992",
  "1988",
  "1986",
  "1973",
  "1954",
  "1932",
];

export default function Filters({
  searchQuery,
  setSearchQuery,
  selectedJurisdiction,
  setSelectedJurisdiction,
  selectedCategory,
  setSelectedCategory,
  selectedYear = "All Years",
  setSelectedYear,
  availableYears = DEFAULT_YEARS_LIST,
  articleType,
  setArticleType,
  totalResults = 0,
}) {
  const isFiltered = 
    searchQuery || 
    selectedJurisdiction !== "All Jurisdictions" || 
    selectedCategory !== "All Categories" || 
    selectedYear !== "All Years" ||
    articleType !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedJurisdiction("All Jurisdictions");
    setSelectedCategory("All Categories");
    if (setSelectedYear) setSelectedYear("All Years");
    setArticleType("ALL");
  };

  const yearsOptions = availableYears && availableYears.length > 0 ? availableYears : DEFAULT_YEARS_LIST;

  return (
    <div className="bg-[#0b132b]/80 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
      {/* Top row: Search Bar & Format Pills */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by case title, citation (e.g. 347 U.S. 483), presiding court, ratio decidendi..."
            className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Article Format Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
          <button
            onClick={() => setArticleType("ALL")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              articleType === "ALL"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Archives
          </button>
          <button
            onClick={() => setArticleType("VERDICT_BRIEF")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
              articleType === "VERDICT_BRIEF"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Landmark className="w-3 h-3" />
            Landmark Verdicts
          </button>
          <button
            onClick={() => setArticleType("LEGAL_NEWS")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
              articleType === "LEGAL_NEWS"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="w-3 h-3" />
            Legal News
          </button>
        </div>
      </div>

      {/* Bottom row: Multi-dimensional dropdowns */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Jurisdiction Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Jurisdiction:</span>
            <select
              value={selectedJurisdiction}
              onChange={(e) => setSelectedJurisdiction(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
            >
              {JURISDICTIONS_LIST.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Legal Domain:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
            >
              {CATEGORIES_LIST.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Decision Year Dropdown */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-xs text-slate-400">Decision Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear && setSelectedYear(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400 font-mono"
            >
              {yearsOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {isFiltered && (
            <button
              onClick={clearFilters}
              className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>

        {/* Results Counter */}
        <div className="text-xs text-slate-400">
          Showing <span className="font-semibold text-amber-300">{totalResults}</span> legal records
        </div>
      </div>
    </div>
  );
}
