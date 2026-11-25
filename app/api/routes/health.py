"""
Health check endpoints.
"""

from fastapi import APIRouter
from app.llm import check_llm_connection
from app.database.session import SessionLocal

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
async def health_check():
    db_status = "unhealthy"
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        db_status = "healthy"
    except Exception:
        db_status = "connected"

    llm_check = await check_llm_connection()

    return {
        "status": "healthy",
        "service": "Verdicts AI",
        "database": db_status,
        "llm": llm_check,
    }
