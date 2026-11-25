"""
Backfill region, country, and decision_date for all Verdicts AI articles.
"""

from app.database.session import SessionLocal
from app.database.models import VerdictArticle
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

SPECIFIC_DATES = {
    "Brown v. Board": "May 17, 1954",
    "Schrems II": "July 16, 2020",
    "Kesavananda Bharati": "April 24, 1973",
    "Donoghue v Stevenson": "May 26, 1932",
    "Nicaragua": "June 27, 1986",
    "Alphabet": "November 2026",
    "Apple": "November 2026",
    "Global Precedents": "November 2026",
}

def backfill():
    db = SessionLocal()
    try:
        articles = db.query(VerdictArticle).all()
        for a in articles:
            # Match geography
            info = GEO_MAP.get(a.jurisdiction, {"region": "Global Jurisdiction", "country": a.jurisdiction or "Global"})
            a.region = info["region"]
            a.country = info["country"]

            # Match date
            matched_date = None
            for k, d in SPECIFIC_DATES.items():
                if k.lower() in (a.case_name or a.title).lower():
                    matched_date = d
                    break
            
            if not matched_date:
                matched_date = a.decision_date or "November 2026"

            a.decision_date = matched_date
            logger.info(f"Article #{a.id}: Country='{a.country}', Region='{a.region}', Date='{a.decision_date}'")

        db.commit()
        print("BACKFILL_SUCCESSFUL")
    finally:
        db.close()

if __name__ == "__main__":
    backfill()
