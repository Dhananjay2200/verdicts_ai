"""
Publishing, Cache Telemetry, and Stats API Routes.
Zero-DB-session async fast-path on RAM cache hits for 1M+ concurrent readers.
"""

import json
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database.session import get_db, SessionLocal
from app.database.models import VerdictArticle
from app.services.cache_service import cache_service
from app.utils.logging import logger

router = APIRouter(prefix="/publishing", tags=["Publishing"])


class UpdateStatusRequest(BaseModel):
    article_id: int
    status: str  # "PUBLISHED", "IN_REVIEW", "DRAFT"


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


@router.post("/update-status")
def update_article_status(req: UpdateStatusRequest, db: Session = Depends(get_db)):
    article = db.query(VerdictArticle).filter(VerdictArticle.id == req.article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found.")
    article.status = req.status
    db.commit()
    cache_service.invalidate()
    return {"status": "success", "article_id": article.id, "new_status": article.status}


@router.post("/articles/{article_id}/toggle-status")
def toggle_article_status(article_id: int, db: Session = Depends(get_db)):
    article = db.query(VerdictArticle).filter(VerdictArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found.")
    article.status = "IN_REVIEW" if article.status == "PUBLISHED" else "PUBLISHED"
    db.commit()
    cache_service.invalidate()
    return {"status": "success", "article_id": article.id, "new_status": article.status}


@router.delete("/articles/{article_id}")
def delete_article(article_id: int, db: Session = Depends(get_db)):
    article = db.query(VerdictArticle).filter(VerdictArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found.")
    db.delete(article)
    db.commit()
    cache_service.invalidate()
    logger.info(f"Deleted Article ID {article_id}")
    return {"status": "success", "deleted_id": article_id}


@router.post("/batch-publish")
def batch_publish_in_review(db: Session = Depends(get_db)):
    updated = db.query(VerdictArticle).filter(VerdictArticle.status == "IN_REVIEW").update(
        {"status": "PUBLISHED"}
    )
    db.commit()
    cache_service.invalidate()
    return {"status": "success", "published_count": updated}


@router.get("/stats")
async def get_publishing_stats(request: Request):
    """Returns dashboard statistics with zero-DB RAM caching, single-flight load, and ETag 304."""
    cache_key = "stats:system"
    accept_enc = request.headers.get("accept-encoding", "")
    payload_bytes, etag, is_gzip = cache_service.get_response_bytes(cache_key, accept_enc)
    if payload_bytes is None:
        def _load_stats():
            db = SessionLocal()
            try:
                total_articles = db.query(func.count(VerdictArticle.id)).scalar() or 0
                published = db.query(func.count(VerdictArticle.id)).filter(VerdictArticle.status == "PUBLISHED").scalar() or 0
                in_review = db.query(func.count(VerdictArticle.id)).filter(VerdictArticle.status == "IN_REVIEW").scalar() or 0
                verdicts = db.query(func.count(VerdictArticle.id)).filter(VerdictArticle.article_type == "VERDICT_BRIEF").scalar() or 0
                news = db.query(func.count(VerdictArticle.id)).filter(VerdictArticle.article_type == "LEGAL_NEWS").scalar() or 0
                avg_val = db.query(func.avg(VerdictArticle.score)).scalar()
                avg_score = round(float(avg_val), 2) if avg_val is not None else 9.0

                return {
                    "total_articles": total_articles,
                    "published": published,
                    "in_review": in_review,
                    "verdicts_count": verdicts,
                    "legal_news_count": news,
                    "average_score": avg_score,
                }
            finally:
                db.close()

        payload_bytes, etag, is_gzip = await run_in_threadpool(
            cache_service.get_or_load_response, cache_key, _load_stats, accept_enc
        )

    if_none_match = request.headers.get("if-none-match")
    if if_none_match and etag and if_none_match.strip() == etag:
        return Response(
            status_code=304,
            headers=_cache_headers(etag),
        )

    return Response(
        content=payload_bytes,
        media_type="application/json",
        headers=_cache_headers(etag, is_gzip=is_gzip),
    )


@router.get("/cache/stats")
def get_cache_telemetry():
    """Returns live in-memory cache metrics: hit ratio, requests count, and cached entries."""
    return cache_service.get_stats()


@router.post("/cache/flush")
def flush_cache():
    """Manually invalidates the high-concurrency memory cache."""
    cache_service.invalidate()
    return {"message": "Memory cache successfully flushed.", "stats": cache_service.get_stats()}
