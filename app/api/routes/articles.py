"""
Articles API Route.
Provides high-concurrency endpoints for fetching verdicts and legal news with
zero-DB-session RAM caching and HTTP 304 ETag short-circuiting for 1M+ readers.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from app.database.session import get_db, SessionLocal
from app.database.models import VerdictArticle, QualityAudit
from app.services.cache_service import cache_service

router = APIRouter(prefix="/articles", tags=["Articles"])


def _cache_headers(etag: str) -> dict:
    return {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "ETag": etag,
        "X-Cache-Engine": "VerdictsAI-HighConcurrency-MemoryCache",
    }


def _build_articles_cache_key(
    category: Optional[str],
    jurisdiction: Optional[str],
    article_type: Optional[str],
    year: Optional[str],
    search: Optional[str],
    status: Optional[str],
    limit: int,
    offset: int,
) -> str:
    return (
        f"articles:st={status or 'ALL'}:cat={category or 'all'}:jur={jurisdiction or 'all'}"
        f":type={article_type or 'all'}:yr={year or 'all'}:q={search or ''}:lim={limit}:off={offset}"
    )


@router.get("")
async def get_articles(
    request: Request,
    category: Optional[str] = Query(None),
    jurisdiction: Optional[str] = Query(None),
    article_type: Optional[str] = Query(None),
    year: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query("PUBLISHED"),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
):
    """
    Combines multi-way filters (Jurisdiction, Category, Year, Type, Search) with pagination.
    Serves repeated requests directly from RAM with ETag 304 short-circuiting.
    """
    cache_key = _build_articles_cache_key(
        category=category,
        jurisdiction=jurisdiction,
        article_type=article_type,
        year=year,
        search=search,
        status=status,
        limit=limit,
        offset=offset,
    )

    json_bytes, etag = cache_service.get_json(cache_key)
    if json_bytes is None:
        def _load_articles():
            db = SessionLocal()
            try:
                query = db.query(VerdictArticle)

                if status and status != "ALL":
                    query = query.filter(VerdictArticle.status == status)
                if category:
                    query = query.filter(VerdictArticle.category == category)
                if jurisdiction:
                    query = query.filter(VerdictArticle.jurisdiction == jurisdiction)
                if article_type:
                    query = query.filter(VerdictArticle.article_type == article_type)
                if year and year != "All Years":
                    y = f"%{year}%"
                    query = query.filter(
                        (VerdictArticle.decision_date.ilike(y)) |
                        (VerdictArticle.citation.ilike(y))
                    )
                if search:
                    s = f"%{search}%"
                    query = query.filter(
                        (VerdictArticle.title.ilike(s)) |
                        (VerdictArticle.case_name.ilike(s)) |
                        (VerdictArticle.citation.ilike(s)) |
                        (VerdictArticle.court.ilike(s)) |
                        (VerdictArticle.key_holding.ilike(s))
                    )

                total = query.count()
                articles = query.order_by(VerdictArticle.created_at.desc()).offset(offset).limit(limit).all()

                payload = jsonable_encoder({
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                    "articles": articles,
                })
                etag_val = cache_service.set(cache_key, payload)
                raw, _ = cache_service.get_json(cache_key)
                return raw, etag_val
            finally:
                db.close()

        json_bytes, etag = await run_in_threadpool(_load_articles)

    if_none_match = request.headers.get("if-none-match")
    if if_none_match and if_none_match.strip() == etag:
        return Response(
            status_code=304,
            headers={
                "ETag": etag,
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "X-Cache-Engine": "VerdictsAI-HighConcurrency-MemoryCache",
            },
        )

    return Response(
        content=json_bytes,
        media_type="application/json",
        headers=_cache_headers(etag),
    )


@router.get("/slug/{slug}")
def get_article_by_slug(slug: str, db: Session = Depends(get_db)):
    """Fetches full 12-section judicial verdict guide or news dispatch by slug."""
    article = db.query(VerdictArticle).filter(VerdictArticle.slug == slug).first()
    if not article:
        raise HTTPException(status_code=404, detail="Judicial verdict article not found.")

    # Increment views
    article.view_count += 1
    db.commit()

    # Get quality audits
    audits = db.query(QualityAudit).filter(QualityAudit.article_id == article.id).all()

    return {
        "article": article,
        "audits": audits,
    }


@router.get("/id/{article_id}")
def get_article_by_id(article_id: int, db: Session = Depends(get_db)):
    """Fetches verdict article by primary key ID."""
    article = db.query(VerdictArticle).filter(VerdictArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Judicial verdict article not found.")
    return article
