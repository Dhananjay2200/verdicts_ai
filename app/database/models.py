"""
SQLAlchemy ORM Models for Verdicts AI.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class VerdictTopic(Base):
    """Represents a discovered legal verdict, precedent, or breaking legal news topic."""
    __tablename__ = "verdict_topics"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    canonical_name = Column(String(255), nullable=False, unique=True, index=True)
    category = Column(String(100), nullable=False, index=True)
    jurisdiction = Column(String(100), nullable=False, index=True)
    region = Column(String(150), nullable=True, index=True)
    country = Column(String(150), nullable=True, index=True)
    court_name = Column(String(200), nullable=True, index=True)
    case_citation = Column(String(150), nullable=True)
    article_type = Column(String(50), default="VERDICT_BRIEF", index=True)  # VERDICT_BRIEF or LEGAL_NEWS
    status = Column(String(50), default="PENDING", index=True)  # PENDING, PROCESSING, GENERATED, FAILED
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    articles = relationship("VerdictArticle", back_populates="topic", cascade="all, delete-orphan")


class VerdictArticle(Base):
    """Full-length authoritative judicial analysis or worldwide legal news article."""
    __tablename__ = "verdict_articles"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("verdict_topics.id", ondelete="CASCADE"), nullable=False, index=True)
    article_type = Column(String(50), default="VERDICT_BRIEF", index=True)  # VERDICT_BRIEF or LEGAL_NEWS
    title = Column(String(300), nullable=False)
    slug = Column(String(300), unique=True, index=True, nullable=False)
    case_name = Column(String(255), nullable=True, index=True)
    citation = Column(String(150), nullable=True)
    court = Column(String(200), nullable=True)
    jurisdiction = Column(String(100), nullable=False, index=True)
    region = Column(String(150), nullable=True, index=True)
    country = Column(String(150), nullable=True, index=True)
    decision_date = Column(String(100), nullable=True)
    bench = Column(String(300), nullable=True)
    vote_split = Column(String(100), nullable=True)
    key_holding = Column(Text, nullable=True)
    meta_description = Column(String(500), nullable=False)
    summary = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    
    category = Column(String(100), nullable=False, index=True)
    tags = Column(String(500), nullable=True)
    is_landmark = Column(Boolean, default=True)
    
    score = Column(Float, default=0.0, index=True)
    status = Column(String(50), default="PUBLISHED", index=True)  # PUBLISHED, IN_REVIEW, DRAFT
    view_count = Column(Integer, default=0)
    
    primary_image_url = Column(String(1000), nullable=True)
    image_caption = Column(String(500), nullable=True)
    image_attribution = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    topic = relationship("VerdictTopic", back_populates="articles")
    audits = relationship("QualityAudit", back_populates="article", cascade="all, delete-orphan")


class QualityAudit(Base):
    """11-Dimension legal and editorial quality evaluation audit records."""
    __tablename__ = "quality_audits"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("verdict_articles.id", ondelete="CASCADE"), nullable=False, index=True)
    overall_score = Column(Float, nullable=False)
    
    legal_accuracy = Column(Float, default=8.0)
    citation_integrity = Column(Float, default=8.0)
    ratio_clarity = Column(Float, default=8.0)
    neutrality = Column(Float, default=8.0)
    dissent_analysis = Column(Float, default=8.0)
    statutory_context = Column(Float, default=8.0)
    procedural_posture = Column(Float, default=8.0)
    precedent_impact = Column(Float, default=8.0)
    readability = Column(Float, default=8.0)
    sourcing_rigor = Column(Float, default=8.0)
    ethical_journalism = Column(Float, default=8.0)
    
    feedback = Column(Text, nullable=True)
    revisions_attempted = Column(Integer, default=0)
    passed = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    article = relationship("VerdictArticle", back_populates="audits")


class AdminUser(Base):
    """Portal administrator for reviews, automation control, and publishing oversight."""
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="SUPER_ADMIN")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SystemSetting(Base):
    """Key-value persistent system settings."""
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
