import React from 'react';
import { Scale, Search, X } from 'lucide-react';

export const TOPIC_TABS = [
  { id: 'all', label: 'All Rulings' },
  { id: 'supreme-court', label: 'Supreme Court', articleType: 'VERDICT_BRIEF' },
  { id: 'constitutional', label: 'Constitutional', category: 'Constitutional & Democratic Law' },
  { id: 'corporate', label: 'Corporate', category: 'Corporate, Securities & Financial Regulation' },
  { id: 'tech-law', label: 'Tech Law', category: 'Tech, AI & Digital Privacy' },
  { id: 'international', label: 'International', category: 'International Sovereignty & Arbitration' },
  { id: 'antitrust', label: 'Antitrust', category: 'Antitrust, Monopolies & Competition' },
  { id: 'human-rights', label: 'Human Rights', category: 'Human Rights & Civil Liberties' },
  { id: 'climate', label: 'Environment', category: 'Environmental & Climate Justice' },
  { id: 'criminal', label: 'Criminal', category: 'Criminal Justice & Due Process' },
  { id: 'legal-wire', label: 'Legal News', articleType: 'LEGAL_NEWS' },
];

export default function Masthead({
  activeTabId,
  onSelectTab,
  searchQuery,
  onSearchChange,
  selectedJurisdiction,
  onJurisdictionChange,
  jurisdictions = [],
  totalCount = 0,
  onGoHome,
}) {
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const jurisdictionOptions = [
    'All Jurisdictions',
    ...jurisdictions.filter((j) => j && j !== 'All Jurisdictions'),
  ];

  return (
    <header className="bg-[#FFFFFF] border-t-4 border-[#1E3A5F] border-b border-[#D1D5DB]">
      {/* Edition Date & Jurisdiction Selector Strip */}
      <div className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#4B5563]">
          <div className="flex items-center gap-3">
            <time dateTime={new Date().toISOString().slice(0, 10)} className="font-medium text-[#111827]">
              {formattedDate}
            </time>
            <span className="text-[#D1D5DB]" aria-hidden="true">|</span>
            <span>Global Judicial &amp; Legal Edition</span>
            {totalCount > 0 && (
              <>
                <span className="hidden sm:inline text-[#D1D5DB]" aria-hidden="true">|</span>
                <span className="hidden sm:inline font-medium text-[#1E3A5F]">
                  {totalCount} Published {totalCount === 1 ? 'Record' : 'Records'}
                </span>
              </>
            )}
            <span className="hidden md:inline text-[#D1D5DB]" aria-hidden="true">|</span>
            <span
              className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium text-[#1E3A5F]"
              title="Automatically displays newly published rulings without manual refresh"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1E3A5F] animate-pulse" aria-hidden="true" />
              <span>Live Edition</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="jurisdiction-select" className="text-xs font-medium text-[#4B5563]">
              Jurisdiction:
            </label>
            <select
              id="jurisdiction-select"
              value={selectedJurisdiction}
              onChange={(e) => onJurisdictionChange(e.target.value)}
              className="bg-[#FFFFFF] border border-[#D1D5DB] text-xs text-[#111827] font-medium px-2.5 py-1 focus:outline-none focus:border-[#1E3A5F]"
            >
              {jurisdictionOptions.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Broadsheet Masthead & Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onGoHome}
              className="text-left group focus:outline-none"
            >
              <div className="flex items-center gap-2.5">
                <Scale className="w-7 h-7 text-[#1E3A5F] shrink-0" strokeWidth={1.75} />
                <span className="font-serif-headline text-3xl sm:text-4xl font-black tracking-tight text-[#111827] group-hover:text-[#1E3A5F] transition-colors">
                  VERDICTS
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-[#4B5563] font-normal">
                Authoritative Court Rulings, Judicial Precedents &amp; Justice News
              </p>
            </button>
          </div>

          {/* Search Bar */}
          <div className="w-full md:w-96">
            <label htmlFor="verdicts-search" className="sr-only">
              Search court rulings, citations, or courts
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#4B5563] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="verdicts-search"
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search cases, citations, courts, or holdings..."
                className="w-full bg-[#F8F9FA] border border-[#D1D5DB] pl-9 pr-9 py-2 text-sm text-[#111827] placeholder-[#6B7280] focus:bg-[#FFFFFF] focus:outline-none focus:border-[#1E3A5F] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-[#111827] p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Courts & Topics Navigation Bar */}
      <nav
        aria-label="Courts and Legal Topics"
        className="border-t border-[#D1D5DB] bg-[#FFFFFF]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center overflow-x-auto no-scrollbar -mb-px gap-1 sm:gap-2">
            {TOPIC_TABS.map((tab) => {
              const isActive = activeTabId === tab.id;
              const isWire = tab.id === 'legal-wire';
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab)}
                  className={`whitespace-nowrap px-3 py-3 text-xs sm:text-[13px] border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? isWire
                        ? 'border-[#991B1B] text-[#991B1B] font-semibold'
                        : 'border-[#1E3A5F] text-[#1E3A5F] font-semibold'
                      : 'border-transparent text-[#4B5563] hover:text-[#111827] hover:border-[#D1D5DB] font-medium'
                  }`}
                >
                  {isWire && (
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        isActive ? 'bg-[#991B1B]' : 'bg-[#991B1B]/60'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </header>
  );
}
