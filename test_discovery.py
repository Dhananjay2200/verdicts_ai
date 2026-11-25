"""
Diagnostics script to test Discovery Service for Verdicts AI.
"""

import asyncio
from app.database.session import SessionLocal
from app.services.discovery_service import DiscoveryService
from app.utils.logging import logger

async def main():
    logger.info("Testing Discovery Service...")
    db = SessionLocal()
    try:
        service = DiscoveryService(db)
        
        # Test 1: Landmark verdict discovery
        verdict = await service.discover_new_verdict(article_type="VERDICT_BRIEF")
        logger.info(f"Discovered Verdict: {verdict['name']} | Court: {verdict['court_name']} | Jur: {verdict['jurisdiction']}")
        
        # Test 2: Legal news discovery
        news = await service.discover_new_verdict(article_type="LEGAL_NEWS")
        logger.info(f"Discovered Legal News: {news['name']} | Jur: {news['jurisdiction']}")
        
        print("DISCOVERY_TESTS_PASSED")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
