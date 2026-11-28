"""
Topics API Route.
Serves jurisdictions, legal categories, discovered topics, and latest court news
with zero-DB-session RAM caching and ETag 304 support for high concurrency.
"""

from typing import Optional
from fastapi import APIRouter, Query, Request, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.encoders import jsonable_encoder
from app.database.session import SessionLocal
from app.database.models import VerdictTopic
from app.services.cache_service import cache_service
from app.services.discovery_service import JURISDICTIONS, CATEGORIES
from app.services.research_service import ResearchService

router = APIRouter(prefix="/topics", tags=["Topics"])


def _cache_headers(etag: str, is_gzip: bool = False) -> dict:
    headers = {
        "Cache-Control": "public, max-age=0, s-maxage=120, stale-while-revalidate=600, must-revalidate",
        "ETag": etag,
        "Vary": "Accept-Encoding",
        "X-Cache-Engine": "VerdictsAI-HighConcurrency-MemoryCache",
    }
    if is_gzip:
        headers["Content-Encoding"] = "gzip"
    return headers


@router.get("/latest-news")
async def get_latest_legal_news(
    request: Request,
    jurisdiction: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(8, ge=1, le=20),
):
    """Fetches real-time latest court rulings & breaking legal news, micro-cached in RAM."""
    cache_key = (
        f"latest_news:jur={jurisdiction or 'all'}:cat={category or 'all'}"
        f":q={query or ''}:days={days}:lim={limit}"
    )
    accept_enc = request.headers.get("accept-encoding", "")
    payload_bytes, etag, is_gzip = cache_service.get_response_bytes(cache_key, accept_enc)
    if payload_bytes is None:
        news = await ResearchService().fetch_latest_news(
            jurisdiction=jurisdiction,
            category=category,
            query=query,
            limit=limit,
            days=days,
        )
        source = news[0]["discovery_source"] if news else "none"
        payload = jsonable_encoder({
            "total": len(news),
            "source": source,
            "news": news,
        })
        etag = cache_service.set(cache_key, payload)
        payload_bytes, etag, is_gzip = cache_service.get_response_bytes(cache_key, accept_enc)

    if_none_match = request.headers.get("if-none-match")
    if if_none_match and etag and if_none_match.strip() == etag:
        return Response(status_code=304, headers=_cache_headers(etag))

    return Response(
        content=payload_bytes,
        media_type="application/json",
        headers=_cache_headers(etag, is_gzip=is_gzip),
    )


@router.get("")
async def get_topics(
    request: Request,
    jurisdiction: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    article_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
):
    """Returns jurisdictions taxonomy and topics from RAM cache with ETag 304 support."""
    cache_key = (
        f"topics:jur={jurisdiction or 'all'}:cat={category or 'all'}"
        f":type={article_type or 'all'}:lim={limit}"
    )

    accept_enc = request.headers.get("accept-encoding", "")
    payload_bytes, etag, is_gzip = cache_service.get_response_bytes(cache_key, accept_enc)
    if payload_bytes is None:
        def _load_topics():
            db = SessionLocal()
            try:
                query = db.query(VerdictTopic)
                if jurisdiction:
                    query = query.filter(VerdictTopic.jurisdiction == jurisdiction)
                if category:
                    query = query.filter(VerdictTopic.category == category)
                if article_type:
                    query = query.filter(VerdictTopic.article_type == article_type)

                topics = query.order_by(VerdictTopic.created_at.desc()).limit(limit).all()
                return jsonable_encoder({
                    "total": len(topics),
                    "jurisdictions": JURISDICTIONS,
                    "categories": CATEGORIES,
                    "topics": topics,
                })
            finally:
                db.close()

        payload_bytes, etag, is_gzip = await run_in_threadpool(
            cache_service.get_or_load_response, cache_key, _load_topics, accept_enc
        )

    if_none_match = request.headers.get("if-none-match")
    if if_none_match and etag and if_none_match.strip() == etag:
        return Response(status_code=304, headers=_cache_headers(etag))

    return Response(
        content=payload_bytes,
        media_type="application/json",
        headers=_cache_headers(etag, is_gzip=is_gzip),
    )
