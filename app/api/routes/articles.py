"""
Articles API Route.
Provides high-concurrency endpoints for fetching verdicts and legal news with
zero-DB-session RAM caching, single-flight DB protection, buffered view tracking,
and HTTP 304 ETag short-circuiting for 1M+ concurrent readers.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.encoders import jsonable_encoder
from app.database.session import SessionLocal
from app.database.models import VerdictArticle, QualityAudit
from app.services.cache_service import cache_service

router = APIRouter(prefix="/articles", tags=["Articles"])


def _cache_headers(etag: str, is_gzip: bool = False, private_admin: bool = False) -> dict:
    cache_ctrl = (
        "no-cache, no-store, must-revalidate"
        if private_admin
        else "public, max-age=30, s-maxage=120, stale-while-revalidate=600"
    )
    headers = {
        "Cache-Control": cache_ctrl,
        "ETag": etag,
        "Vary": "Accept-Encoding",
        "X-Cache-Engine": "VerdictsAI-HighConcurrency-MemoryCache",
    }
    if is_gzip:
        headers["Content-Encoding"] = "gzip"
    return headers


def _not_modified_response(etag: str, private_admin: bool = False) -> Response:
    return Response(
        status_code=304,
        headers=_cache_headers(etag, private_admin=private_admin),
    )


def _cached_json_response(
    request: Request,
    payload_bytes: bytes,
    etag: Optional[str],
    is_gzip: bool,
    private_admin: bool = False,
) -> Response:
    if_none_match = request.headers.get("if-none-match")
    if if_none_match and etag and if_none_match.strip() == etag:
        return _not_modified_response(etag, private_admin=private_admin)

    return Response(
        content=payload_bytes,
        media_type="application/json",
        headers=_cache_headers(etag, is_gzip=is_gzip, private_admin=private_admin),
    )


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
    Serves repeated requests directly from RAM with single-flight protection & ETag 304.
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

    accept_enc = request.headers.get("accept-encoding", "")
    payload_bytes, etag, is_gzip = cache_service.get_response_bytes(cache_key, accept_enc)
    if payload_bytes is None:
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

                return jsonable_encoder({
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                    "articles": articles,
                })
            finally:
                db.close()

        payload_bytes, etag, is_gzip = await run_in_threadpool(
            cache_service.get_or_load_response, cache_key, _load_articles, accept_enc
        )

    return _cached_json_response(
        request, payload_bytes, etag, is_gzip, private_admin=(status == "ALL")
    )


@router.get("/slug/{slug}")
async def get_article_by_slug(slug: str, request: Request):
    """
    Fetches full 12-section judicial verdict guide or news dispatch by slug from RAM cache.
    Records view counts asynchronously in memory to eliminate DB row-lock contention under load.
    """
    cache_key = f"article:slug:{slug}"
    accept_enc = request.headers.get("accept-encoding", "")
    payload_bytes, etag, is_gzip = cache_service.get_response_bytes(cache_key, accept_enc)
    if payload_bytes is None:
        def _load_slug():
            db = SessionLocal()
            try:
                article = db.query(VerdictArticle).filter(VerdictArticle.slug == slug).first()
                if not article:
                    return None
                audits = db.query(QualityAudit).filter(QualityAudit.article_id == article.id).all()
                return jsonable_encoder({
                    "article": article,
                    "audits": audits,
                })
            finally:
                db.close()

        payload_bytes, etag, is_gzip = await run_in_threadpool(
            cache_service.get_or_load_response, cache_key, _load_slug, accept_enc
        )
        if not payload_bytes:
            raise HTTPException(status_code=404, detail="Judicial verdict article not found.")

    cached_obj, _ = cache_service.get(cache_key)
    if isinstance(cached_obj, dict):
        art = cached_obj.get("article")
        if isinstance(art, dict) and art.get("id"):
            cache_service.record_view(int(art["id"]))

    return _cached_json_response(request, payload_bytes, etag, is_gzip)


@router.get("/id/{article_id}")
async def get_article_by_id(article_id: int, request: Request):
    """Fetches verdict article by primary key ID from RAM cache with ETag 304 support."""
    cache_key = f"article:id:{article_id}"
    accept_enc = request.headers.get("accept-encoding", "")
    payload_bytes, etag, is_gzip = cache_service.get_response_bytes(cache_key, accept_enc)
    if payload_bytes is None:
        def _load_id():
            db = SessionLocal()
            try:
                article = db.query(VerdictArticle).filter(VerdictArticle.id == article_id).first()
                if not article:
                    return None
                return jsonable_encoder(article)
            finally:
                db.close()

        payload_bytes, etag, is_gzip = await run_in_threadpool(
            cache_service.get_or_load_response, cache_key, _load_id, accept_enc
        )
        if not payload_bytes:
            raise HTTPException(status_code=404, detail="Judicial verdict article not found.")

    return _cached_json_response(request, payload_bytes, etag, is_gzip)
