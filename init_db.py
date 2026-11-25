"""
Database initialization script for Verdicts AI.
Creates the database if missing, generates all tables, and seeds initial data.
"""

import sys
import hashlib
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from app.config import get_settings
from app.database.session import engine, Base, SessionLocal
from app.database.models import AdminUser, SystemSetting, VerdictTopic, VerdictArticle, QualityAudit
from app.utils.logging import logger

settings = get_settings()

def get_pg_params(url: str):
    """Parse postgres connection URL."""
    clean = url.replace("postgresql+psycopg2://", "").replace("postgresql://", "")
    auth, host_db = clean.split("@")
    user, password = auth.split(":")
    host_port, db = host_db.split("/")
    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host, port = host_port, "5432"
    return user, password, host, int(port), db

def ensure_database_exists():
    """Ensure PostgreSQL database exists; if not, create it."""
    user, password, host, port, db_name = get_pg_params(settings.DATABASE_URL)
    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user=user,
            password=password,
            host=host,
            port=port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}';")
        exists = cur.fetchone()
        if not exists:
            cur.execute(f"CREATE DATABASE \"{db_name}\";")
            logger.info(f"Created PostgreSQL database: {db_name}")
        else:
            logger.info(f"Database '{db_name}' already exists.")
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(f"Error ensuring database existence: {e}")
        raise e

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def seed_initial_data():
    """Seeds admin user and initial landmark verdicts and worldwide legal news."""
    db = SessionLocal()
    try:
        # 1. Admin user
        admin = db.query(AdminUser).filter(AdminUser.username == settings.ADMIN_USERNAME).first()
        if not admin:
            admin = AdminUser(
                username=settings.ADMIN_USERNAME,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                role="SUPER_ADMIN"
            )
            db.add(admin)
            logger.info(f"Seeded admin user '{settings.ADMIN_USERNAME}'")

        # 2. System settings
        daily_quota = db.query(SystemSetting).filter(SystemSetting.key == "daily_quota").first()
        if not daily_quota:
            db.add(SystemSetting(key="daily_quota", value=str(settings.DAILY_ARTICLE_LIMIT)))
        
        db.commit()
        logger.info("Database initialized and default records verified.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed initial data: {e}")
        raise e
    finally:
        db.close()

def main():
    logger.info("Initializing Verdicts AI database...")
    ensure_database_exists()
    logger.info("Creating database tables from SQLAlchemy models...")
    Base.metadata.create_all(bind=engine)
    logger.info("Tables created successfully.")
    seed_initial_data()
    logger.info("Database initialization completed successfully.")

if __name__ == "__main__":
    main()
