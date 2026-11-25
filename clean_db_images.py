"""
Cleans image URLs, captions, and attributions in PostgreSQL for existing Verdicts AI articles.
"""

from app.database.session import SessionLocal
from app.database.models import VerdictArticle
from app.services.image_service import clean_html, sanitize_attribution, sanitize_image_url
from app.utils.logging import logger

def clean_database_media():
    db = SessionLocal()
    try:
        articles = db.query(VerdictArticle).all()
        logger.info(f"Checking {len(articles)} articles for media sanitization...")
        updated = 0
        for a in articles:
            dirty = False
            
            # Clean attribution
            if a.image_attribution:
                clean_attr = sanitize_attribution(a.image_attribution)
                if clean_attr != a.image_attribution:
                    a.image_attribution = clean_attr
                    dirty = True

            # Clean caption
            if a.image_caption:
                clean_cap = clean_html(a.image_caption)
                if clean_cap != a.image_caption:
                    a.image_caption = clean_cap
                    dirty = True

            # Clean URL
            if a.primary_image_url:
                clean_url = sanitize_image_url(a.primary_image_url)
                # If SVG, replace with curated fallback
                if clean_url.lower().endswith((".svg", ".ogg", ".webm", ".tif")):
                    clean_url = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop"
                if clean_url != a.primary_image_url:
                    a.primary_image_url = clean_url
                    dirty = True

            if dirty:
                updated += 1
                logger.info(f"Sanitized media for Article ID {a.id}: '{a.title}'")

        db.commit()
        logger.info(f"Database media sanitization complete. Updated {updated} records.")
        print(f"MEDIA_CLEANED_COUNT={updated}")
    finally:
        db.close()

if __name__ == "__main__":
    clean_database_media()
