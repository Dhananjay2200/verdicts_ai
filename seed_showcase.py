"""
Seed showcase verdicts and breaking worldwide legal news for Verdicts AI.
"""

import asyncio
from app.graph.workflow import run_verdict_pipeline
from app.services.discovery_service import LANDMARK_VERDICTS_CATALOG, BREAKING_LEGAL_NEWS_CATALOG
from app.utils.logging import logger

async def seed_showcase():
    logger.info("Seeding showcase landmark verdicts and breaking worldwide legal news...")
    
    # Seed 3 additional landmark cases
    for item in LANDMARK_VERDICTS_CATALOG[1:5]:
        logger.info(f"Seeding Landmark Case: {item['name']}...")
        await run_verdict_pipeline(
            topic_name=item["name"],
            target_jurisdiction=item["jurisdiction"],
            target_category=item["category"],
            article_type="VERDICT_BRIEF"
        )
    
    # Seed 2 breaking legal news stories
    for item in BREAKING_LEGAL_NEWS_CATALOG[:2]:
        logger.info(f"Seeding Legal News: {item['name']}...")
        await run_verdict_pipeline(
            topic_name=item["name"],
            target_jurisdiction=item["jurisdiction"],
            target_category=item["category"],
            article_type="LEGAL_NEWS"
        )

    logger.info("Showcase seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed_showcase())
