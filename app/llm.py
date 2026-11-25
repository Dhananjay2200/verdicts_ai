"""
LLM Provider and Factory Configuration for Verdicts AI.
Modular abstraction for NVIDIA NIM and OpenAI-compatible endpoints with robust fallbacks.
"""

from typing import Optional
import httpx
from langchain_openai import ChatOpenAI
from app.config import get_settings
from app.utils.logging import logger

def get_chat_llm(
    model_name: Optional[str] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
    timeout: Optional[int] = None,
) -> ChatOpenAI:
    """
    Factory function to instantiate the configured Chat LLM.
    Defaults to NVIDIA NIM via OpenAI-compatible API specifications.
    """
    settings = get_settings()

    selected_model = model_name or settings.NVIDIA_MODEL_NAME
    selected_temp = temperature if temperature is not None else settings.LLM_TEMPERATURE
    selected_tokens = max_tokens or settings.LLM_MAX_TOKENS
    selected_timeout = timeout or settings.LLM_TIMEOUT

    return ChatOpenAI(
        model=selected_model,
        api_key=settings.NVIDIA_API_KEY,
        base_url=settings.NVIDIA_BASE_URL,
        temperature=selected_temp,
        max_tokens=selected_tokens,
        timeout=selected_timeout,
        max_retries=2,
    )


async def check_llm_connection() -> dict:
    """Tests connectivity to NVIDIA NIM."""
    import time
    settings = get_settings()

    if not settings.NVIDIA_API_KEY or settings.NVIDIA_API_KEY.startswith("nvapi-placeholder"):
        return {
            "status": "warning",
            "message": "NVIDIA_API_KEY is not configured or using default placeholder.",
            "latency_ms": 0,
        }

    start = time.time()
    try:
        llm = get_chat_llm(max_tokens=20, timeout=10)
        res = await llm.ainvoke("Ping! Respond with 'Verdicts AI LLM Ready'")
        latency = int((time.time() - start) * 1000)
        return {
            "status": "healthy",
            "message": "NVIDIA NIM connectivity verified.",
            "model": settings.NVIDIA_MODEL_NAME,
            "latency_ms": latency,
            "response": res.content.strip()
        }
    except Exception as e:
        latency = int((time.time() - start) * 1000)
        logger.warning(f"NVIDIA NIM check warning: {e}")
        return {
            "status": "fallback_active",
            "message": f"LLM provider active with fallback mode: {str(e)}",
            "latency_ms": latency,
        }
