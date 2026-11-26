import React, { useMemo, useState } from 'react';

function StatusPill({ article }) {
  const isNews = article.article_type === 'LEGAL_NEWS';
  const isLandmark = Boolean(article.is_landmark) && !isNews;

  if (isNews) {
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-semibold bg-[#991B1B] text-white">
        Breaking Verdict &amp; Wire
      </span>
    );
  }

  if (isLandmark) {
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-semibold bg-[#991B1B] text-white">
        Landmark Ruling
      </span>
    );
  }

  return (
    <span className="inline-block px-2 py-0.5 text-[11px] font-semibold bg-[#1E3A5F] text-white">
      {article.status || 'Published'}
    </span>
  );
}

function stripInlineMarkdown(text) {
  return text.replace(/[*_`]+/g, '').trim();
}

function getSummaryExcerpt(article) {
  if (article.key_holding && article.key_holding.trim()) {
    return stripInlineMarkdown(article.key_holding);
  }
  if (article.summary && article.summary.trim()) {
    return stripInlineMarkdown(article.summary);
  }
  if (article.meta_description && article.meta_description.trim()) {
    return stripInlineMarkdown(article.meta_description);
  }
  return 'Full judicial analysis, statutory context, and holding available in the complete opinion brief.';
}

export default function BroadsheetHome({ articles = [], onOpenArticle }) {
  const [brokenImages, setBrokenImages] = useState({});

  const { leadVerdict, docketsList, analysisCards, secondaryFeed } = useMemo(() => {
    if (!articles.length) {
      return { leadVerdict: null, docketsList: [], analysisCards: [], secondaryFeed: [] };
    }

    // Lead verdict: prefer landmark VERDICT_BRIEF, otherwise first article
    const lead =
      articles.find((a) => a.article_type === 'VERDICT_BRIEF' && a.is_landmark) ||
      articles.find((a) => a.article_type === 'VERDICT_BRIEF') ||
      articles[0];

    const remaining = articles.filter((a) => a.id !== lead.id);

    // Left column (25%): Latest Dockets & Updates (prioritize LEGAL_NEWS first, then newest)
    const newsItems = remaining.filter((a) => a.article_type === 'LEGAL_NEWS');
    const nonNewsItems = remaining.filter((a) => a.article_type !== 'LEGAL_NEWS');
    const leftPool = [...newsItems, ...nonNewsItems];
    const dockets = leftPool.slice(0, Math.min(6, Math.ceil(remaining.length / 2) || 0));
    const docketIds = new Set(dockets.map((d) => d.id));

    // Right column (25%): Analysis & Key Rulings
    const rightPool = remaining.filter((a) => !docketIds.has(a.id));
    const analysis = rightPool.slice(0, 5);
    const analysisIds = new Set(analysis.map((a) => a.id));

    // Any remaining go under the Lead Verdict in the center column
    const secondary = remaining.filter((a) => !docketIds.has(a.id) && !analysisIds.has(a.id));

    return {
      leadVerdict: lead,
      docketsList: dockets,
      analysisCards: analysis,
      secondaryFeed: secondary,
    };
  }, [articles]);

  if (!leadVerdict) return null;

  const showLeadImage = leadVerdict.primary_image_url && !brokenImages[leadVerdict.id];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN (25%): Latest Dockets & Updates */}
      <aside className="lg:col-span-3 order-2 lg:order-1 bg-[#FFFFFF] border border-[#D1D5DB]">
        <div className="px-4 py-3 border-b-2 border-[#111827] flex items-center justify-between">
          <h2 className="font-serif-headline text-sm font-bold text-[#111827]">
            Latest Dockets &amp; Updates
          </h2>
          <span className="text-[11px] font-semibold text-[#991B1B]">
            {docketsList.length}
          </span>
        </div>

        {docketsList.length === 0 ? (
          <div className="p-4 text-xs text-[#4B5563]">
            Additional filings will appear here as new dockets are published.
          </div>
        ) : (
          <div className="divide-y divide-[#D1D5DB]">
            {docketsList.map((item) => (
              <article
                key={item.id}
                onClick={() => onOpenArticle(item)}
                className="p-4 hover:bg-[#F8F9FA] transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#4B5563] mb-1.5">
                  <span className="font-semibold text-[#1E3A5F] truncate">
                    {item.jurisdiction}
                  </span>
                  <span className="shrink-0">{item.decision_date}</span>
                </div>

                <h3 className="font-serif-headline text-[15px] font-bold text-[#111827] group-hover:text-[#1E3A5F] leading-snug">
                  {item.case_name || item.title}
                </h3>

                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[#4B5563]">
                  <span className="truncate">{item.court}</span>
                  {item.article_type === 'LEGAL_NEWS' && (
                    <span className="text-[#991B1B] font-semibold shrink-0">Breaking</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </aside>

      {/* CENTER COLUMN (50%): Lead Landmark Verdict + Secondary Broadsheet Reports */}
      <section className="lg:col-span-6 order-1 lg:order-2 space-y-6">
        <article className="bg-[#FFFFFF] border border-[#D1D5DB] border-t-4 border-t-[#1E3A5F]">
          <div className="p-5 sm:p-7 space-y-4">
            {/* Status Pill & Citation */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB]">
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusPill article={leadVerdict} />
                <span className="text-xs font-medium text-[#4B5563]">
                  {leadVerdict.category}
                </span>
              </div>
              <span className="text-xs font-medium text-[#4B5563]">
                {leadVerdict.decision_date}
              </span>
            </div>

            {/* Lead Serif Headline */}
            <h1
              onClick={() => onOpenArticle(leadVerdict)}
              className="font-serif-headline text-2xl sm:text-3xl font-bold text-[#111827] hover:text-[#1E3A5F] transition-colors leading-tight cursor-pointer"
            >
              {leadVerdict.title}
            </h1>

            {/* Court & Citation Subline */}
            <div className="text-xs sm:text-sm text-[#4B5563] flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-[#111827]">{leadVerdict.court}</span>
              <span aria-hidden="true">/</span>
              <span>{leadVerdict.jurisdiction}</span>
              {leadVerdict.citation && (
                <>
                  <span aria-hidden="true">/</span>
                  <span>{leadVerdict.citation}</span>
                </>
              )}
            </div>

            {/* Optional Image */}
            {showLeadImage && (
              <figure className="border border-[#D1D5DB] bg-[#F8F9FA]">
                <img
                  src={leadVerdict.primary_image_url}
                  alt={leadVerdict.image_caption || leadVerdict.title}
                  onError={() =>
                    setBrokenImages((prev) => ({ ...prev, [leadVerdict.id]: true }))
                  }
                  className="w-full max-h-80 object-cover block"
                />
                {leadVerdict.image_caption && (
                  <figcaption className="px-3 py-2 text-xs text-[#4B5563] border-t border-[#D1D5DB] bg-[#FFFFFF]">
                    {leadVerdict.image_caption}
                  </figcaption>
                )}
              </figure>
            )}

            {/* 2-3 Line Summary */}
            <p className="text-base text-[#4B5563] leading-relaxed line-clamp-3">
              {getSummaryExcerpt(leadVerdict)}
            </p>

            {/* Footer Action */}
            <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between gap-4">
              <div className="text-xs text-[#4B5563]">
                {leadVerdict.vote_split ? (
                  <span>
                    Bench Decision:{' '}
                    <strong className="font-semibold text-[#111827]">
                      {leadVerdict.vote_split}
                    </strong>
                  </span>
                ) : (
                  <span>Full Judicial Brief</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => onOpenArticle(leadVerdict)}
                className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#162C49] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Read Full Ruling
              </button>
            </div>
          </div>
        </article>

        {/* Secondary Broadsheet Rulings */}
        {secondaryFeed.length > 0 && (
          <div className="bg-[#FFFFFF] border border-[#D1D5DB]">
            <div className="px-5 py-3 border-b border-[#D1D5DB] bg-[#F8F9FA]">
              <h2 className="font-serif-headline text-sm font-bold text-[#111827]">
                Additional Archive Rulings
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:gap-px bg-[#D1D5DB]">
              {secondaryFeed.map((item) => (
                <article
                  key={item.id}
                  onClick={() => onOpenArticle(item)}
                  className="bg-[#FFFFFF] p-5 hover:bg-[#F8F9FA] transition-colors cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#4B5563]">
                      <span className="font-semibold text-[#1E3A5F] truncate">
                        {item.category}
                      </span>
                      <span className="shrink-0">{item.decision_date}</span>
                    </div>

                    <h3 className="font-serif-headline text-base font-bold text-[#111827] group-hover:text-[#1E3A5F] leading-snug">
                      {item.case_name || item.title}
                    </h3>

                    <p className="text-xs text-[#4B5563] leading-relaxed line-clamp-3">
                      {getSummaryExcerpt(item)}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-[11px] text-[#4B5563]">
                    <span className="truncate">{item.court}</span>
                    <span className="font-semibold text-[#1E3A5F] shrink-0">Read brief</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* RIGHT COLUMN (25%): Analysis & Key Rulings */}
      <aside className="lg:col-span-3 order-3 space-y-4">
        <div className="bg-[#FFFFFF] border border-[#D1D5DB]">
          <div className="px-4 py-3 border-b-2 border-[#111827]">
            <h2 className="font-serif-headline text-sm font-bold text-[#111827]">
              Analysis &amp; Key Rulings
            </h2>
          </div>

          {analysisCards.length === 0 ? (
            <div className="p-4 text-xs text-[#4B5563]">
              Select another topic or clear filters to explore additional precedent analyses.
            </div>
          ) : (
            <div className="divide-y divide-[#D1D5DB]">
              {analysisCards.map((item) => (
                <article
                  key={item.id}
                  onClick={() => onOpenArticle(item)}
                  className="p-4 hover:bg-[#F8F9FA] transition-colors cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#1E3A5F] truncate">
                      {item.category}
                    </span>
                    {item.is_landmark && (
                      <span className="text-[10px] font-semibold text-[#991B1B] shrink-0">
                        Precedent
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif-headline text-[15px] font-bold text-[#111827] group-hover:text-[#1E3A5F] leading-snug">
                    {item.case_name || item.title}
                  </h3>

                  <p className="text-xs text-[#4B5563] leading-relaxed line-clamp-2">
                    {getSummaryExcerpt(item)}
                  </p>

                  <div className="pt-1 flex items-center justify-between gap-2 text-[11px] text-[#6B7280]">
                    <span className="truncate">{item.court}</span>
                    <span className="shrink-0">{item.decision_date}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
