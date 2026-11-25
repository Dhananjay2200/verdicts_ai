"""
Diagnostics script to test NVIDIA NIM / LLM connectivity for Verdicts AI.
"""

import asyncio
from app.llm import check_llm_connection
from app.utils.logging import logger

async def main():
    logger.info("Testing LLM connectivity for Verdicts AI...")
    res = await check_llm_connection()
    logger.info(f"LLM Check Result: {res}")
    print("NIM_TEST_COMPLETED")

if __name__ == "__main__":
    asyncio.run(main())
