"""
Diagnostics script to test Wikipedia and search research for Verdicts AI.
"""

import asyncio
from app.services.research_service import ResearchService
from app.utils.logging import logger

async def main():
    logger.info("Testing Research Service on landmark case...")
    service = ResearchService()
    test_topic = {
        "name": "Brown v. Board of Education of Topeka",
        "category": "Constitutional & Democratic Law",
        "jurisdiction": "United States",
        "court_name": "Supreme Court of the United States"
    }
    res = await service.synthesize_research(test_topic)
    logger.info(f"Research synthesis generated: {len(res['synthesis'])} chars, {res['raw_sources_count']} sources.")
    print("RESEARCH_TESTS_PASSED")

if __name__ == "__main__":
    asyncio.run(main())
