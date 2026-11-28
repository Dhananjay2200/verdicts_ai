"""
Health check endpoints.
"""

from fastapi import APIRouter
from sqlalchemy import text
from app.llm import check_llm_connection
from app.database.session import SessionLocal

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/live")
async def liveness_probe():
    """Instant zero-dependency liveness probe for load balancers & Nginx upstreams."""
    return {"status": "ok", "service": "Verdicts AI"}


@router.get("")
async def health_check():
    db_status = "unhealthy"
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    finally:
        db.close()

    llm_check = await check_llm_connection()

    return {
        "status": "healthy",
        "service": "Verdicts AI",
        "database": db_status,
        "llm": llm_check,
    }
