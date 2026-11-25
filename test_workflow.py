"""
End-to-End Test for Verdicts AI LangGraph Pipeline.
Runs full multi-agent cycle for a landmark case and publishes to PostgreSQL.
"""

import asyncio
from app.graph.workflow import run_verdict_pipeline
from app.database.session import SessionLocal
from app.database.models import VerdictArticle, QualityAudit
from app.utils.logging import logger

async def main():
    logger.info("Starting End-to-End Verdicts AI Pipeline Test...")
    result = await run_verdict_pipeline(
        topic_name="Brown v. Board of Education of Topeka",
        target_jurisdiction="United States",
        target_category="Constitutional & Democratic Law",
        article_type="VERDICT_BRIEF"
    )
    
    logger.info(f"Pipeline Result Status: {result.get('status')}")
    article_id = result.get("published_article_id")
    logger.info(f"Published Article ID: {article_id}")
    
    if article_id:
        db = SessionLocal()
        article = db.query(VerdictArticle).filter(VerdictArticle.id == article_id).first()
        audits = db.query(QualityAudit).filter(QualityAudit.article_id == article_id).all()
        db.close()
        
        if article:
            logger.info(f"Verified Article in DB:")
            logger.info(f" - Title: {article.title}")
            logger.info(f" - Citation: {article.citation}")
            logger.info(f" - Court: {article.court}")
            logger.info(f" - Score: {article.score}/10")
            logger.info(f" - Status: {article.status}")
            logger.info(f" - Image: {article.primary_image_url}")
            logger.info(f" - Quality Audits: {len(audits)}")
            print("WORKFLOW_END_TO_END_PASSED")
            return
            
    print("WORKFLOW_TEST_COMPLETED")

if __name__ == "__main__":
    asyncio.run(main())
