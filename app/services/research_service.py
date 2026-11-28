"""
Verdicts AI - Multi-Source Legal Research Service.
Integrates Wikipedia REST/Action API, Tavily Search/News API, and Google News Legal RSS
to gather authentic court records, statutory citations, holdings, and latest breaking legal news.
"""

import html
import re
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Dict, List, Optional, Any
import httpx
from app.config import get_settings
from app.utils.logging import logger


def _clean_rss_text(raw: str) -> str:
    if not raw:
        return ""
    unescaped = html.unescape(raw)
    no_tags = re.sub(r"<[^>]+>", " ", unescaped)
    return re.sub(r"\s+", " ", no_tags).strip()


def _format_news_date(raw_date: Optional[str]) -> str:
    if not raw_date:
        return datetime.utcnow().strftime("%B %d, %Y")
    text = raw_date.strip()
    try:
        dt = parsedate_to_datetime(text)
        return dt.strftime("%B %d, %Y")
    except Exception:
        pass
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            dt = datetime.strptime(text[:19], fmt[:len(text[:19])])
            return dt.strftime("%B %d, %Y")
        except Exception:
            continue
    return text[:40]


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

    async def fetch_tavily_research(
        self,
        topic_name: str,
        category: str,
        jurisdiction: str,
        article_type: str = "VERDICT_BRIEF",
    ) -> List[Dict[str, Any]]:
        """Queries Tavily Search API for verified court records, ratio decidendi, and news updates."""
        if not self.settings.TAVILY_API_KEY or self.settings.TAVILY_API_KEY.startswith("tvly-placeholder"):
            return []

        url = "https://api.tavily.com/search"
        payload: Dict[str, Any] = {
            "api_key": self.settings.TAVILY_API_KEY,
            "query": f"{topic_name} {jurisdiction} {category} court judgment ruling ratio decidendi citation holding",
            "search_depth": self.settings.TAVILY_SEARCH_DEPTH,
            "include_answer": True,
            "max_results": 5,
        }
        if article_type == "LEGAL_NEWS":
            payload["topic"] = "news"
            payload["days"] = 14

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("results", [])
        except Exception as e:
            logger.warning(f"Tavily legal search error for '{topic_name}': {e}")
        return []

    async def fetch_rss_legal_news(
        self,
        jurisdiction: Optional[str] = None,
        category: Optional[str] = None,
        query: Optional[str] = None,
        limit: int = 8,
    ) -> List[Dict[str, Any]]:
        """Fallback live legal news fetcher using Google News RSS."""
        terms = [query.strip()] if query and query.strip() else []
        if jurisdiction and jurisdiction != "All Jurisdictions":
            terms.append(jurisdiction)
        if category and category != "All Categories":
            terms.append(category.split("&")[0].strip())
        terms.append("court ruling OR supreme court verdict OR legal judgment")
        search_q = " ".join(terms)
        rss_url = (
            "https://news.google.com/rss/search?"
            f"q={urllib.parse.quote_plus(search_q)}&hl=en-US&gl=US&ceid=US:en"
        )

        items: List[Dict[str, Any]] = []
        try:
            async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
                resp = await client.get(
                    rss_url,
                    headers={"User-Agent": "VerdictsAI/1.0 (contact: info@verdicts.ai)"},
                )
                if resp.status_code != 200:
                    return []
                root = ET.fromstring(resp.text)
                for item in root.findall("./channel/item")[:limit]:
                    raw_title = (item.findtext("title") or "").strip()
                    link = (item.findtext("link") or "").strip()
                    pub_date = item.findtext("pubDate")
                    source_el = item.find("source")
                    source_name = (
                        source_el.text.strip()
                        if source_el is not None and source_el.text
                        else "Legal News Wire"
                    )
                    # Strip trailing " - Publisher" from Google News titles if present
                    clean_title = raw_title
                    if " - " in raw_title and source_name:
                        clean_title = raw_title.rsplit(" - ", 1)[0].strip()

                    snippet = _clean_rss_text(item.findtext("description") or "")
                    if clean_title:
                        items.append({
                            "title": clean_title[:240],
                            "url": link,
                            "source": source_name,
                            "published_date": _format_news_date(pub_date),
                            "snippet": snippet[:400],
                            "jurisdiction": jurisdiction or "Global",
                            "category": category or "Constitutional & Democratic Law",
                            "discovery_source": "google_news_rss",
                        })
        except Exception as e:
            logger.warning(f"RSS legal news fetch error: {e}")

        return items

    async def fetch_latest_news(
        self,
        jurisdiction: Optional[str] = None,
        category: Optional[str] = None,
        query: Optional[str] = None,
        limit: int = 8,
        days: int = 7,
    ) -> List[Dict[str, Any]]:
        """
        Fetches latest real-world court rulings and breaking legal news.
        Uses Tavily News Search (topic='news') when configured, with Google News RSS fallback.
        """
        results: List[Dict[str, Any]] = []
        has_tavily = (
            bool(self.settings.TAVILY_API_KEY)
            and not self.settings.TAVILY_API_KEY.startswith("tvly-placeholder")
            and not self.settings.TAVILY_API_KEY.startswith("your_")
        )

        if has_tavily:
            query_parts = [query.strip()] if query and query.strip() else []
            if jurisdiction and jurisdiction != "All Jurisdictions":
                query_parts.append(jurisdiction)
            if category and category != "All Categories":
                query_parts.append(category)
            query_parts.append("court ruling verdict supreme court judgment legal decision")
            search_query = " ".join(query_parts)

            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(
                        "https://api.tavily.com/search",
                        json={
                            "api_key": self.settings.TAVILY_API_KEY,
                            "query": search_query,
                            "topic": "news",
                            "days": days,
                            "search_depth": "advanced",
                            "include_answer": False,
                            "exclude_domains": [
                                "reddit.com",
                                "quora.com",
                                "pinterest.com",
                                "facebook.com",
                                "instagram.com",
                                "twitter.com",
                                "x.com",
                                "tiktok.com",
                                "youtube.com",
                            ],
                            "max_results": min(max(limit, 1), 15),
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        for r in data.get("results", []):
                            title = (r.get("title") or "").strip()
                            if not title:
                                continue
                            url = (r.get("url") or "").strip()
                            domain = urllib.parse.urlparse(url).netloc.replace("www.", "") if url else "Tavily News"
                            results.append({
                                "title": title[:240],
                                "url": url,
                                "source": domain or "Legal News Wire",
                                "published_date": _format_news_date(r.get("published_date")),
                                "snippet": (r.get("content") or "").strip()[:400],
                                "jurisdiction": jurisdiction or "Global",
                                "category": category or "Constitutional & Democratic Law",
                                "discovery_source": "tavily_news",
                            })
            except Exception as e:
                logger.warning(f"Tavily latest news fetch error: {e}")

        if not results:
            results = await self.fetch_rss_legal_news(
                jurisdiction=jurisdiction,
                category=category,
                query=query,
                limit=limit,
            )

        return results[:limit]

    async def synthesize_research(self, topic: Dict[str, Any]) -> Dict[str, Any]:
        """Combines Wikipedia legal archives and Tavily search results."""
        name = topic.get("name", "")
        category = topic.get("category", "")
        jurisdiction = topic.get("jurisdiction", "")
        court_name = topic.get("court_name", "")
        article_type = topic.get("article_type", "VERDICT_BRIEF")

        wiki_data = await self.fetch_wikipedia_summary(name)
        tavily_results = await self.fetch_tavily_research(
            name, category, jurisdiction, article_type=article_type
        )

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
