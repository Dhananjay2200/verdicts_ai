"""
Publishing, Cache Telemetry, and Stats API Routes.
Zero-DB-session async fast-path on RAM cache hits for 1M+ concurrent readers.
"""

import json
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db, SessionLocal
from app.database.models import VerdictArticle
from app.services.cache_service import cache_service
from app.utils.logging import logger

router = APIRouter(prefix="/publishing", tags=["Publishing"])


class UpdateStatusRequest(BaseModel):
    article_id: int
    status: str  # "PUBLISHED", "IN_REVIEW", "DRAFT"


def _cache_headers(etag: str) -> dict:
    return {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "ETag": etag,
        "X-Cache-Engine": "VerdictsAI-HighConcurrency-MemoryCache",
    }


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
    """Returns dashboard statistics with zero-DB RAM caching and ETag 304 support."""
    cache_key = "stats:system"
    json_bytes, etag = cache_service.get_json(cache_key)
    if json_bytes is None:
        def _load_stats():
            db = SessionLocal()
            try:
                total_articles = db.query(VerdictArticle).count()
                published = db.query(VerdictArticle).filter(VerdictArticle.status == "PUBLISHED").count()
                in_review = db.query(VerdictArticle).filter(VerdictArticle.status == "IN_REVIEW").count()
                verdicts = db.query(VerdictArticle).filter(VerdictArticle.article_type == "VERDICT_BRIEF").count()
                news = db.query(VerdictArticle).filter(VerdictArticle.article_type == "LEGAL_NEWS").count()

                articles = db.query(VerdictArticle.score).all()
                avg_score = round(sum(a[0] for a in articles) / len(articles), 2) if articles else 9.0

                stats = {
                    "total_articles": total_articles,
                    "published": published,
                    "in_review": in_review,
                    "verdicts_count": verdicts,
                    "legal_news_count": news,
                    "average_score": avg_score,
                }
                etag_val = cache_service.set(cache_key, stats)
                raw, _ = cache_service.get_json(cache_key)
                if raw is None:
                    raw = json.dumps(stats, default=str).encode("utf-8")
                return raw, etag_val
            finally:
                db.close()

        json_bytes, etag = await run_in_threadpool(_load_stats)

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


@router.get("/cache/stats")
def get_cache_telemetry():
    """Returns live in-memory cache metrics: hit ratio, requests count, and cached entries."""
    return cache_service.get_stats()


@router.post("/cache/flush")
def flush_cache():
    """Manually invalidates the high-concurrency memory cache."""
    cache_service.invalidate()
    return {"message": "Memory cache successfully flushed.", "stats": cache_service.get_stats()}
