"""
Workflow Execution API Route.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.graph.workflow import run_verdict_pipeline
from app.utils.logging import logger

router = APIRouter(prefix="/workflow", tags=["Workflow"])


class RunWorkflowRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    jurisdiction: Optional[str] = None
    article_type: Optional[str] = "VERDICT_BRIEF"  # "VERDICT_BRIEF" or "LEGAL_NEWS"
    news_angle: Optional[str] = None


@router.post("/run")
async def trigger_workflow(req: RunWorkflowRequest):
    """Executes a complete LangGraph cycle for a Verdict or Legal News story."""
    try:
        result = await run_verdict_pipeline(
            topic_name=req.name,
            target_jurisdiction=req.jurisdiction,
            target_category=req.category,
            article_type=req.article_type or "VERDICT_BRIEF",
            news_angle=req.news_angle,
        )
        return {
            "status": "success",
            "workflow_result": {
                "topic": result.get("topic"),
                "status": result.get("status"),
                "article_title": result.get("article", {}).get("title"),
                "article_type": result.get("article_type", "VERDICT_BRIEF"),
                "score": result.get("evaluation", {}).get("overall_score"),
                "passed": result.get("evaluation", {}).get("passed"),
                "published_article_id": result.get("published_article_id"),
            }
        }
    except Exception as e:
        logger.error(f"Workflow execution failure: {e}")
        raise HTTPException(status_code=500, detail=str(e))
