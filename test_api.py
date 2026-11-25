"""
Diagnostics script to test FastAPI endpoints for Verdicts AI.
"""

from fastapi.testclient import TestClient
from app.main import app
from app.utils.logging import logger

client = TestClient(app)

def test_all_endpoints():
    logger.info("Testing FastAPI endpoints for Verdicts AI...")
    
    # 1. Health
    r = client.get("/api/v1/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    logger.info(f"Health Check: {r.json()['status']}, DB: {r.json()['database']}")
    
    # 2. Topics
    r = client.get("/api/v1/topics")
    assert r.status_code == 200
    logger.info(f"Topics: total={r.json()['total']}, jurisdictions={len(r.json()['jurisdictions'])}")
    
    # 3. Articles Public Feed
    r = client.get("/api/v1/articles")
    assert r.status_code == 200
    articles = r.json()["articles"]
    logger.info(f"Articles Feed: count={len(articles)}, total={r.json()['total']}")
    if articles:
        slug = articles[0]["slug"]
        logger.info(f"Article #1: title='{articles[0]['title']}', slug='{slug}'")
        
        # 4. Article Detail by Slug
        r_slug = client.get(f"/api/v1/articles/slug/{slug}")
        assert r_slug.status_code == 200
        logger.info(f"Article Detail: court='{r_slug.json()['article']['court']}', audits={len(r_slug.json()['audits'])}")

    # 5. Publishing Stats
    r_stats = client.get("/api/v1/publishing/stats")
    assert r_stats.status_code == 200
    logger.info(f"Publishing Stats: {r_stats.json()}")

    print("ALL_API_ENDPOINTS_PASSED")

if __name__ == "__main__":
    test_all_endpoints()
