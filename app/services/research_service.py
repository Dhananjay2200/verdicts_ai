"""
Verdicts AI - Multi-Source Legal Research Service.
Integrates Wikipedia REST/Action API, Wikidata, and Tavily Search API to gather
authentic court records, statutory citations, holdings, bench compositions, and legal background.
"""

from typing import Dict, List, Optional, Any
import httpx
from app.config import get_settings
from app.utils.logging import logger


class ResearchService:
    def __init__(self):
        self.settings = get_settings()

    async def fetch_wikipedia_summary(self, topic_name: str) -> Optional[Dict[str, Any]]:
        """Fetches judicial extracts and case history from Wikipedia API."""
        url = "https://en.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "format": "json",
            "titles": topic_name,
            "prop": "extracts|pageprops|info",
            "exintro": "1",
            "explaintext": "1",
            "redirects": "1",
        }
        headers = {"User-Agent": "VerdictsAI/1.0 (contact: info@verdicts.ai)"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, params=params, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    pages = data.get("query", {}).get("pages", {})
                    for page_id, page in pages.items():
                        if page_id != "-1":
                            return {
                                "title": page.get("title", topic_name),
                                "extract": page.get("extract", ""),
                                "page_id": page_id,
                                "source": "Wikipedia Legal Archive",
                            }
        except Exception as e:
            logger.warning(f"Wikipedia legal research fetch error for '{topic_name}': {e}")
        return None

    async def fetch_tavily_research(self, topic_name: str, category: str, jurisdiction: str) -> List[Dict[str, Any]]:
        """Queries Tavily Search API for verified court records, ratio decidendi, and news updates."""
        if not self.settings.TAVILY_API_KEY or self.settings.TAVILY_API_KEY.startswith("tvly-placeholder"):
            return []

        url = "https://api.tavily.com/search"
        payload = {
            "api_key": self.settings.TAVILY_API_KEY,
            "query": f"{topic_name} {jurisdiction} {category} court judgment ruling ratio decidendi citation holding",
            "search_depth": self.settings.TAVILY_SEARCH_DEPTH,
            "include_answer": True,
            "max_results": 5,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("results", [])
        except Exception as e:
            logger.warning(f"Tavily legal search error for '{topic_name}': {e}")
        return []

    async def synthesize_research(self, topic: Dict[str, Any]) -> Dict[str, Any]:
        """Combines Wikipedia legal archives and Tavily search results."""
        name = topic.get("name", "")
        category = topic.get("category", "")
        jurisdiction = topic.get("jurisdiction", "")
        court_name = topic.get("court_name", "")

        wiki_data = await self.fetch_wikipedia_summary(name)
        tavily_results = await self.fetch_tavily_research(name, category, jurisdiction)

        facts = []
        if wiki_data and wiki_data.get("extract"):
            facts.append(wiki_data["extract"])

        sources = []
        for r in tavily_results:
            snippet = r.get("content", "")
            title = r.get("title", "")
            url = r.get("url", "")
            if snippet:
                facts.append(f"{title}: {snippet}")
            if url:
                sources.append({"title": title, "url": url})

        synthesis_text = "\n\n".join(facts) if facts else (
            f"Case record regarding {name} presided over by {court_name} in {jurisdiction}. "
            f"Key legal questions span {category}, statutory precedents, and constitutional review."
        )

        return {
            "synthesis": synthesis_text[:3500],
            "raw_sources_count": len(facts),
            "sources": sources,
            "wiki_title": wiki_data.get("title") if wiki_data else None,
            "jurisdiction": jurisdiction,
            "category": category,
            "court_name": court_name,
        }
