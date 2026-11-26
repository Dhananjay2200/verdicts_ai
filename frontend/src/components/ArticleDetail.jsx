import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Check, Copy, ExternalLink, Printer } from 'lucide-react';
import { fetchArticleBySlug } from '../services/api';
import { ArticleDetailSkeleton, BroadsheetErrorBanner } from './States';

export default function ArticleDetail({
  slug,
  initialArticle = null,
  onBack,
}) {
  const [article, setArticle] = useState(initialArticle);
  const [loading, setLoading] = useState(!initialArticle || !initialArticle.content);
  const [error, setError] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);

  // Reading progress bar listener
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) {
        setScrollProgress(0);
        return;
      }
      const pct = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
      setScrollProgress(pct);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [slug]);

  // Fetch full article from backend by slug
  const loadFullArticle = async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const { article: fetched } = await fetchArticleBySlug(slug);
      setArticle(fetched);
      setImageBroken(false);
    } catch (err) {
      // If we already have initialArticle with full content, keep showing it cleanly
      if (!initialArticle?.content) {
        setError(err.message || 'Unable to load this ruling from the backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    loadFullArticle();
  }, [slug]);

  const handleCopyCitation = () => {
    if (!article) return;
    const text = `${article.case_name || article.title}, ${article.citation || ''} (${article.court || 'Court of Record'}).`;
    navigator.clipboard?.writeText(text);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  if (loading && !article) {
    return <ArticleDetailSkeleton />;
  }

  if (error && !article) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A5F] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Broadsheet</span>
        </button>
        <BroadsheetErrorBanner message={error} onRetry={loadFullArticle} />
      </div>
    );
  }

  if (!article) return null;

  const isBreaking = article.article_type === 'LEGAL_NEWS' || article.is_landmark;
  const officialSourceUrl = article.source_url;
  const verdictSummary =
    article.key_holding || article.summary || article.meta_description || 'Official judicial record.';

  return (
    <>
      {/* Top Reading Progress Bar */}
      <div
        className="fixed top-0 left-0 right-0 h-1 bg-[#E5E7EB] z-50"
        role="progressbar"
        aria-valuenow={Math.round(scrollProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress"
      >
        <div
          className={`h-full transition-[width] duration-75 ${
            isBreaking ? 'bg-[#991B1B]' : 'bg-[#1E3A5F]'
          }`}
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <article className="max-w-4xl mx-auto bg-[#FFFFFF] border border-[#D1D5DB]">
        {/* Top Utility Navigation */}
        <div className="px-6 sm:px-10 py-4 border-b border-[#D1D5DB] bg-[#F8F9FA] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A5F] hover:text-[#111827] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Broadsheet</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCitation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] border border-[#D1D5DB] text-xs font-medium text-[#111827] hover:border-[#1E3A5F] transition-colors cursor-pointer"
            >
              {copiedCitation ? (
                <Check className="w-3.5 h-3.5 text-[#1E3A5F]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#4B5563]" />
              )}
              <span>{copiedCitation ? 'Citation Copied' : 'Copy Citation'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] border border-[#D1D5DB] text-xs font-medium text-[#111827] hover:border-[#1E3A5F] transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#4B5563]" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Article Header */}
        <header className="px-6 sm:px-10 pt-8 pb-6 border-b border-[#D1D5DB] space-y-4">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span
              className={`px-2.5 py-0.5 font-semibold text-white ${
                isBreaking ? 'bg-[#991B1B]' : 'bg-[#1E3A5F]'
              }`}
            >
              {article.article_type === 'LEGAL_NEWS'
                ? 'Breaking Dispatch'
                : article.is_landmark
                  ? 'Landmark Verdict'
                  : 'Judicial Opinion'}
            </span>
            <span className="font-medium text-[#1E3A5F]">{article.category}</span>
            {article.citation && (
              <>
                <span className="text-[#D1D5DB]" aria-hidden="true">/</span>
                <span className="text-[#4B5563]">{article.citation}</span>
              </>
            )}
          </div>

          <h1 className="font-serif-headline text-3xl sm:text-4xl font-bold text-[#111827] leading-tight">
            {article.title}
          </h1>

          {article.meta_description && (
            <p className="text-base sm:text-lg text-[#4B5563] leading-relaxed">
              {article.meta_description}
            </p>
          )}
        </header>

        {/* Verdict at a Glance Callout Box */}
        <div className="px-6 sm:px-10 pt-6">
          <section
            aria-label="Verdict at a Glance"
            className="bg-[#F1F5F9] border border-[#D1D5DB] border-l-4 border-l-[#1E3A5F] p-5 sm:p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D1D5DB] pb-3">
              <h2 className="font-serif-headline text-base font-bold text-[#1E3A5F]">
                Verdict at a Glance
              </h2>

              {officialSourceUrl && (
                <a
                  href={officialSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1E3A5F] hover:bg-[#162C49] text-white text-xs font-semibold transition-colors"
                >
                  <span>View Official Document / Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-xs font-semibold text-[#4B5563]">Court</dt>
                <dd className="mt-0.5 font-medium text-[#111827]">{article.court}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[#4B5563]">Decision Date</dt>
                <dd className="mt-0.5 font-medium text-[#111827]">{article.decision_date}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[#4B5563]">Category</dt>
                <dd className="mt-0.5 font-medium text-[#111827]">{article.category}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[#4B5563]">Jurisdiction</dt>
                <dd className="mt-0.5 font-medium text-[#111827]">{article.jurisdiction}</dd>
              </div>
            </dl>

            {(article.vote_split || article.bench) && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2 border-t border-[#D1D5DB]">
                {article.vote_split && (
                  <div>
                    <dt className="text-xs font-semibold text-[#4B5563]">Decision Split</dt>
                    <dd className="mt-0.5 font-medium text-[#111827]">{article.vote_split}</dd>
                  </div>
                )}
                {article.bench && (
                  <div>
                    <dt className="text-xs font-semibold text-[#4B5563]">Presiding Bench</dt>
                    <dd className="mt-0.5 text-[#111827]">{article.bench}</dd>
                  </div>
                )}
              </dl>
            )}

            <div className="pt-2 border-t border-[#D1D5DB]">
              <div className="text-xs font-semibold text-[#4B5563] mb-1">Ruling / Summary</div>
              <p className="font-serif-headline text-sm sm:text-base text-[#111827] leading-relaxed">
                {verdictSummary}
              </p>
            </div>
          </section>
        </div>

        {/* Optional Lead Image */}
        {article.primary_image_url && !imageBroken && (
          <div className="px-6 sm:px-10 pt-6">
            <figure className="border border-[#D1D5DB] bg-[#F8F9FA]">
              <img
                src={article.primary_image_url}
                alt={article.image_caption || article.title}
                onError={() => setImageBroken(true)}
                className="w-full max-h-[440px] object-cover block"
              />
              {(article.image_caption || article.image_attribution) && (
                <figcaption className="px-4 py-2 text-xs text-[#4B5563] border-t border-[#D1D5DB] bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-2">
                  <span>{article.image_caption}</span>
                  {article.image_attribution && (
                    <span className="text-[#6B7280]">{article.image_attribution}</span>
                  )}
                </figcaption>
              )}
            </figure>
          </div>
        )}

        {/* High-Legibility Article Content */}
        <div className="px-6 sm:px-10 py-8 sm:py-10">
          <div className="max-w-2xl mx-auto text-lg leading-8 broadsheet-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {article.content}
            </ReactMarkdown>
          </div>

          {/* Prominent Bottom Source CTA if backend provides an official URL */}
          {officialSourceUrl && (
            <div className="max-w-2xl mx-auto mt-10 pt-6 border-t border-[#D1D5DB] flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-[#4B5563]">
                Primary court filing and source documentation
              </div>
              <a
                href={officialSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E3A5F] hover:bg-[#162C49] text-white text-sm font-semibold transition-colors"
              >
                <span>View Official Document / Source</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Tags Strip */}
          {article.tags_list && article.tags_list.length > 0 && (
            <div className="max-w-2xl mx-auto mt-8 pt-6 border-t border-[#D1D5DB] flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#4B5563] mr-1">Topics:</span>
              {article.tags_list.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs bg-[#F8F9FA] border border-[#D1D5DB] text-[#4B5563]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    </>
  );
}
