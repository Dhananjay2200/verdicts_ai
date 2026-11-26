import React from 'react';
import { AlertTriangle, RefreshCw, Scale } from 'lucide-react';

export function BroadsheetSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse" aria-label="Loading verdicts">
      {/* Left Column Skeleton (25%) */}
      <div className="lg:col-span-3 bg-[#FFFFFF] border border-[#D1D5DB] p-5 space-y-5">
        <div className="h-4 w-40 bg-[#E5E7EB]" />
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="pt-4 border-t border-[#D1D5DB] space-y-2">
            <div className="h-3 w-24 bg-[#E5E7EB]" />
            <div className="h-4 w-full bg-[#E5E7EB]" />
            <div className="h-4 w-4/5 bg-[#E5E7EB]" />
          </div>
        ))}
      </div>

      {/* Center Column Skeleton (50%) */}
      <div className="lg:col-span-6 bg-[#FFFFFF] border border-[#D1D5DB] border-t-4 border-t-[#1E3A5F] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-28 bg-[#E5E7EB]" />
          <div className="h-4 w-32 bg-[#E5E7EB]" />
        </div>
        <div className="h-8 w-full bg-[#E5E7EB]" />
        <div className="h-8 w-3/4 bg-[#E5E7EB]" />
        <div className="h-64 w-full bg-[#E5E7EB]" />
        <div className="space-y-2 pt-2">
          <div className="h-4 w-full bg-[#E5E7EB]" />
          <div className="h-4 w-full bg-[#E5E7EB]" />
          <div className="h-4 w-2/3 bg-[#E5E7EB]" />
        </div>
      </div>

      {/* Right Column Skeleton (25%) */}
      <div className="lg:col-span-3 space-y-4">
        {[1, 2, 3].map((card) => (
          <div key={card} className="bg-[#FFFFFF] border border-[#D1D5DB] p-4 space-y-2.5">
            <div className="h-3 w-28 bg-[#E5E7EB]" />
            <div className="h-5 w-full bg-[#E5E7EB]" />
            <div className="h-3 w-5/6 bg-[#E5E7EB]" />
            <div className="h-3 w-1/2 bg-[#E5E7EB]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ArticleDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto bg-[#FFFFFF] border border-[#D1D5DB] p-6 sm:p-10 space-y-6 animate-pulse">
      <div className="h-4 w-32 bg-[#E5E7EB]" />
      <div className="h-10 w-5/6 bg-[#E5E7EB]" />
      <div className="h-10 w-2/3 bg-[#E5E7EB]" />
      <div className="bg-[#F8F9FA] border border-[#D1D5DB] border-l-4 border-l-[#1E3A5F] p-5 space-y-3">
        <div className="h-4 w-40 bg-[#E5E7EB]" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="h-10 bg-[#E5E7EB]" />
          <div className="h-10 bg-[#E5E7EB]" />
          <div className="h-10 bg-[#E5E7EB]" />
          <div className="h-10 bg-[#E5E7EB]" />
        </div>
      </div>
      <div className="max-w-2xl mx-auto space-y-4 pt-4">
        <div className="h-4 w-full bg-[#E5E7EB]" />
        <div className="h-4 w-full bg-[#E5E7EB]" />
        <div className="h-4 w-11/12 bg-[#E5E7EB]" />
        <div className="h-4 w-full bg-[#E5E7EB]" />
        <div className="h-4 w-3/4 bg-[#E5E7EB]" />
      </div>
    </div>
  );
}

export function BroadsheetErrorBanner({ message, apiBaseUrl, onRetry }) {
  return (
    <div
      role="alert"
      className="bg-[#FFFFFF] border border-[#D1D5DB] border-l-4 border-l-[#991B1B] p-6 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-[#991B1B] shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <h2 className="font-serif-headline text-lg font-bold text-[#111827]">
              Backend Service Unavailable
            </h2>
            <p className="text-sm text-[#4B5563]">
              {message || 'Could not retrieve court rulings from the backend server.'}
            </p>
            {apiBaseUrl && (
              <p className="text-xs text-[#6B7280] font-mono">
                Configured endpoint: {apiBaseUrl}
              </p>
            )}
          </div>
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] hover:bg-[#162C49] text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function BroadsheetEmptyState({
  title = 'No court rulings match these filters',
  description = 'Adjust your search terms, jurisdiction, or topic tab to inspect other records in the docket.',
  onReset,
}) {
  return (
    <div className="bg-[#FFFFFF] border border-[#D1D5DB] p-10 sm:p-14 text-center max-w-2xl mx-auto">
      <Scale className="w-8 h-8 text-[#1E3A5F] mx-auto mb-3" strokeWidth={1.5} />
      <h2 className="font-serif-headline text-xl font-bold text-[#111827]">{title}</h2>
      <p className="text-sm text-[#4B5563] mt-2 leading-relaxed">{description}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 inline-flex items-center px-4 py-2 bg-[#1E3A5F] hover:bg-[#162C49] text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}
