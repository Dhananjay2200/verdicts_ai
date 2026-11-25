"""
Diagnostics script to test PostgreSQL connection and tables for Verdicts AI.
"""

from app.database.session import engine, SessionLocal
from app.database.models import AdminUser, VerdictTopic, VerdictArticle
from app.utils.logging import logger

def test_db_connection():
    try:
        with engine.connect() as conn:
            logger.info("Engine connection to verdicts_ai verified successfully.")
        
        db = SessionLocal()
        admin_count = db.query(AdminUser).count()
        topic_count = db.query(VerdictTopic).count()
        article_count = db.query(VerdictArticle).count()
        db.close()
        
        logger.info(f"DB Diagnostics:")
        logger.info(f" - Admin Users: {admin_count}")
        logger.info(f" - Discovered Topics: {topic_count}")
        logger.info(f" - Published/Draft Articles: {article_count}")
        print("ALL_DATABASE_TESTS_PASSED")
        return True
    except Exception as e:
        logger.error(f"Database test failed: {e}")
        print(f"FAILED: {e}")
        return False

if __name__ == "__main__":
    test_db_connection()
