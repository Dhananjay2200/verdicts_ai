"""
Verdicts AI - LangGraph State Definition.
"""

from typing import Dict, List, Optional, Any
from typing_extensions import TypedDict


class VerdictState(TypedDict, total=False):
    # Discovery phase
    topic: Dict[str, Any]
    target_jurisdiction: Optional[str]
    target_category: Optional[str]
    article_type: Optional[str]  # "VERDICT_BRIEF" or "LEGAL_NEWS"
    news_angle: Optional[str]    # Custom news headline/event angle
    is_duplicate: bool
    
    # Research phase
    research: Dict[str, Any]
    
    # Writing & SEO phase
    article: Dict[str, Any]
    seo: Dict[str, Any]
    
    # Media & Image phase
    image: Dict[str, Any]
    
    # Quality gate & Revision phase
    evaluation: Dict[str, Any]
    revision_count: int
    max_revisions: int
    
    # Final publication
    published_article_id: Optional[int]
    status: str
    errors: List[str]
