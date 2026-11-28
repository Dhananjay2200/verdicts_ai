"""
Database session, high-concurrency connection pooling, and schema initialization for Verdicts AI.
"""

from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import get_settings
from app.utils.logging import logger

settings = get_settings()

if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=settings.DB_ECHO,
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=10,     # Prevent connection pool starvation lockups under traffic spikes
        pool_recycle=1800,   # Recycle connections every 30 minutes to prevent stale TCP sockets
        pool_pre_ping=True,  # Automatically detects and discards stale/dead connections
        echo=settings.DB_ECHO,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Yields a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_models() -> None:
    """Creates all database tables and composite performance indexes if they do not exist."""
    try:
        Base.metadata.create_all(bind=engine)
        if "postgresql" in settings.DATABASE_URL:
            with engine.begin() as conn:
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_verdict_feed_status_created "
                    "ON verdict_articles (status, created_at DESC);"
                ))
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_verdict_feed_filters "
                    "ON verdict_articles (status, article_type, category, jurisdiction);"
                ))
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_verdict_topics_created "
                    "ON verdict_topics (created_at DESC);"
                ))
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_verdict_topics_filters "
                    "ON verdict_topics (jurisdiction, category, article_type);"
                ))
        logger.info("[+] Database schema & high-concurrency composite indexes verified/created.")
    except Exception as e:
        logger.error(f"[-] Database table initialization failed: {e}")
        raise e
