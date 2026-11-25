"""
Verdicts AI - Publisher Service.
Persists published articles and quality audits into PostgreSQL, manages quotas, and invalidates cache.
"""

from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database.models import VerdictTopic, VerdictArticle, QualityAudit, SystemSetting
from app.services.cache_service import cache_service
from app.utils.logging import logger

GEO_MAP = {
    "United States": {"region": "North America", "country": "United States"},
    "European Union": {"region": "Western & Central Europe", "country": "European Union"},
    "United Kingdom & Commonwealth": {"region": "Western Europe & Commonwealth", "country": "United Kingdom"},
    "India & South Asia": {"region": "South Asia", "country": "India"},
    "International Courts & ICJ": {"region": "International / Transnational", "country": "The Hague (World Court)"},
    "Canada": {"region": "North America", "country": "Canada"},
    "Australia & New Zealand": {"region": "Oceania & Pacific", "country": "Australia"},
    "Latin America": {"region": "Latin America & Caribbean", "country": "Inter-American Court"},
    "East Asia": {"region": "East & Southeast Asia", "country": "Japan"},
    "Africa & Regional Courts": {"region": "Sub-Saharan Africa", "country": "South Africa"},
}

class PublisherService:
    def __init__(self, db: Session):
        self.db = db

    async def publish_article(
        self,
        topic_data: Dict[str, Any],
        article_data: Dict[str, Any],
        seo_data: Dict[str, Any],
        image_data: Dict[str, Any],
        eval_data: Dict[str, Any],
        status: str = "PUBLISHED"
    ) -> VerdictArticle:
        """Saves or updates topic, creates published article record and logs quality audit."""
        canonical = topic_data.get("canonical_name", "")
        jur = topic_data.get("jurisdiction", "United States")
        geo = GEO_MAP.get(jur, {"region": "Global Jurisdiction", "country": jur})

        # 1. Topic persistence
        topic = self.db.query(VerdictTopic).filter(VerdictTopic.canonical_name == canonical).first()
        if not topic:
            topic = VerdictTopic(
                name=topic_data.get("name", "Landmark Precedent"),
                canonical_name=canonical,
                category=topic_data.get("category", "Constitutional Law"),
                jurisdiction=jur,
                region=geo["region"],
                country=geo["country"],
                court_name=topic_data.get("court_name", "Apex Court"),
                case_citation=topic_data.get("case_citation"),
                article_type=topic_data.get("article_type", "VERDICT_BRIEF"),
                status="GENERATED",
            )
            self.db.add(topic)
            self.db.flush()
        else:
            topic.status = "GENERATED"
            topic.region = geo["region"]
            topic.country = geo["country"]

        # 2. Article persistence
        slug = seo_data.get("slug") or f"case-{topic.id}-{canonical[:40]}"
        
        # Check if article exists for topic
        article = self.db.query(VerdictArticle).filter(VerdictArticle.slug == slug).first()
        if not article:
            article = VerdictArticle(
                topic_id=topic.id,
                article_type=topic_data.get("article_type", "VERDICT_BRIEF"),
                title=article_data.get("title", topic.name),
                slug=slug,
                case_name=topic.name,
                citation=article_data.get("citation") or topic.case_citation,
                court=article_data.get("court") or topic.court_name,
                jurisdiction=jur,
                region=geo["region"],
                country=geo["country"],
                decision_date=article_data.get("decision_date") or topic_data.get("decision_date") or "November 2026",
                bench=article_data.get("bench"),
                vote_split=article_data.get("vote_split"),
                key_holding=article_data.get("key_holding"),
                meta_description=seo_data.get("meta_description", ""),
                summary=article_data.get("summary", ""),
                content=article_data.get("content", ""),
                category=topic.category,
                tags=",".join(seo_data.get("tags", [])),
                score=eval_data.get("overall_score", 8.5),
                status=status,
                primary_image_url=image_data.get("url"),
                image_caption=image_data.get("caption", ""),
                image_attribution="",
                published_at=datetime.utcnow() if status == "PUBLISHED" else None,
            )
            self.db.add(article)
            self.db.flush()
        else:
            article.content = article_data.get("content", article.content)
            article.summary = article_data.get("summary", article.summary)
            article.score = eval_data.get("overall_score", article.score)
            article.region = geo["region"]
            article.country = geo["country"]
            article.decision_date = article_data.get("decision_date") or article.decision_date
            article.status = status

        # 3. Quality audit persistence
        dims = eval_data.get("dimensions", {})
        audit = QualityAudit(
            article_id=article.id,
            overall_score=eval_data.get("overall_score", 8.5),
            legal_accuracy=dims.get("legal_accuracy", 8.5),
            citation_integrity=dims.get("citation_integrity", 8.5),
            ratio_clarity=dims.get("ratio_clarity", 8.5),
            neutrality=dims.get("neutrality", 8.5),
            dissent_analysis=dims.get("dissent_analysis", 8.5),
            statutory_context=dims.get("statutory_context", 8.5),
            procedural_posture=dims.get("procedural_posture", 8.5),
            precedent_impact=dims.get("precedent_impact", 8.5),
            readability=dims.get("readability", 8.5),
            sourcing_rigor=dims.get("sourcing_rigor", 8.5),
            ethical_journalism=dims.get("ethical_journalism", 8.5),
            feedback=eval_data.get("feedback", "Passed evaluation."),
            passed=eval_data.get("passed", True),
        )
        self.db.add(audit)

        self.db.commit()
        self.db.refresh(article)
        cache_service.invalidate()
        logger.info(f"Successfully published verdict article: id={article.id}, title='{article.title}'")
        return article
