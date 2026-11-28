"""
Topics API Route.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import VerdictTopic
from app.services.discovery_service import JURISDICTIONS, CATEGORIES
from app.services.research_service import ResearchService

router = APIRouter(prefix="/topics", tags=["Topics"])


@router.get("/latest-news")
async def get_latest_legal_news(
    jurisdiction: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(8, ge=1, le=20),
):
    """Fetches real-time latest court rulings & breaking legal news from Tavily News / RSS."""
    news = await ResearchService().fetch_latest_news(
        jurisdiction=jurisdiction,
        category=category,
        query=query,
        limit=limit,
        days=days,
    )
    source = news[0]["discovery_source"] if news else "none"
    return {
        "total": len(news),
        "source": source,
        "news": news,
    }

@router.get("")
def get_topics(
    jurisdiction: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    article_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(VerdictTopic)
    if jurisdiction:
        query = query.filter(VerdictTopic.jurisdiction == jurisdiction)
    if category:
        query = query.filter(VerdictTopic.category == category)
    if article_type:
        query = query.filter(VerdictTopic.article_type == article_type)
    
    topics = query.order_by(VerdictTopic.created_at.desc()).limit(limit).all()
    return {
        "total": len(topics),
        "jurisdictions": JURISDICTIONS,
        "categories": CATEGORIES,
        "topics": topics,
    }
