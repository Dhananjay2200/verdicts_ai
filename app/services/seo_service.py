"""
Verdicts AI - SEO Optimization Service.
Generates canonical slugs, high-CTR meta descriptions, legal taxonomy tags, and citation arrays.
"""

import re
from typing import Dict, Any, List


class SEOService:
    def __init__(self):
        pass

    def generate_slug(self, title: str, citation: str = "") -> str:
        """Creates URL-friendly, unique slug from title and citation."""
        text = f"{title} {citation}".lower()
        # Replace non-alphanumeric with hyphen
        slug = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
        # Collapse multiple hyphens
        slug = re.sub(r"-+", "-", slug)
        return slug[:120].rstrip("-")

    def generate_meta_description(self, article: Dict[str, Any]) -> str:
        """Crafts a search-engine-optimized meta summary."""
        name = article.get("title", "")
        citation = article.get("citation", "")
        court = article.get("court", "")
        holding = article.get("key_holding", "")
        desc = (
            f"Definitive legal analysis of {name} ({citation}) by {court}. "
            f"Explore judicial bench details, ratio decidendi, dissents, and holding: {holding}"
        )
        return desc[:300]

    def generate_legal_tags(self, article: Dict[str, Any]) -> List[str]:
        """Generates taxonomy keywords and legal tags."""
        tags = set()
        if article.get("category"):
            tags.add(article["category"])
        if article.get("jurisdiction"):
            tags.add(article["jurisdiction"])
        if article.get("court"):
            tags.add(article["court"])
        
        # Add legal taxonomy keywords
        tags.update(["Constitutional Law", "Supreme Court", "Landmark Precedent", "Ratio Decidendi", "Judicial Review"])
        return list(tags)[:8]
