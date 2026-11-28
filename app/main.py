"""
Verdicts AI - FastAPI Main Application.
High-throughput, GZip-compressed, static SPA-ready platform built for 1M+ concurrent readers.
"""

import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import get_settings
from app.database.session import SessionLocal, init_models
from app.database.models import VerdictArticle
from app.services.cache_service import cache_service
from app.api.routes import (
    health,
    auth,
    topics,
    articles,
    publishing,
    workflow,
    automation,
)
from app.utils.logging import logger

settings = get_settings()


def _flush_buffered_views() -> None:
    """Batch-writes buffered article view increments without blocking reader requests."""
    pending = cache_service.pop_pending_views()
    if not pending:
        return
    db = SessionLocal()
    try:
        for article_id, count in pending.items():
            db.query(VerdictArticle).filter(VerdictArticle.id == article_id).update(
                {VerdictArticle.view_count: VerdictArticle.view_count + count}
            )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning(f"[Views] Buffered view flush skipped: {exc}")
    finally:
        db.close()


async def _periodic_view_flusher(interval_seconds: int = 15) -> None:
    while True:
        await asyncio.sleep(interval_seconds)
        await asyncio.to_thread(_flush_buffered_views)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: initialize database tables, composite indexes, and async view flusher."""
    logger.info(f"Starting {settings.APP_NAME} in [{settings.APP_ENV}] mode...")
    init_models()
    flusher_task = asyncio.create_task(_periodic_view_flusher())
    logger.info(f"{settings.APP_NAME} backend service initialized and ready.")
    try:
        yield
    finally:
        flusher_task.cancel()
        try:
            await flusher_task
        except asyncio.CancelledError:
            pass
        await asyncio.to_thread(_flush_buffered_views)
        logger.info(f"Shutting down {settings.APP_NAME}...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Autonomous Global Legal Verdicts & Judicial Precedents Research, Deep Case Analysis & Worldwide Legal News Publishing Platform.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for production (https://verdicts.in) and local dev frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["ETag", "X-Cache-Engine", "Content-Encoding"],
)

# High-Speed GZip Compression for payloads >= 500 bytes (75-80% bandwidth reduction at 1M scale)
app.add_middleware(GZipMiddleware, minimum_size=500, compresslevel=5)

# Include Routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(topics.router, prefix="/api/v1")
app.include_router(articles.router, prefix="/api/v1")
app.include_router(publishing.router, prefix="/api/v1")
app.include_router(workflow.router, prefix="/api/v1")
app.include_router(automation.router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "documentation": "/docs",
        "jurisdictions_coverage": 10,
        "legal_categories": 12,
        "cache_telemetry": "/api/v1/publishing/cache/stats",
        "react_app": "/app",
        "status": "operational",
    }


# Mount compiled React SPA if built for single-container production serving
dist_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
assets_dir = os.path.join(dist_dir, "assets")
if os.path.exists(dist_dir) and os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/robots.txt", tags=["SEO"])
    async def serve_robots():
        robots_path = os.path.join(dist_dir, "robots.txt")
        if os.path.exists(robots_path):
            return FileResponse(robots_path, media_type="text/plain")
        return FileResponse(os.path.join(dist_dir, "index.html"))

    @app.get("/sitemap.xml", tags=["SEO"])
    async def serve_sitemap():
        sitemap_path = os.path.join(dist_dir, "sitemap.xml")
        if os.path.exists(sitemap_path):
            return FileResponse(sitemap_path, media_type="application/xml")
        return FileResponse(os.path.join(dist_dir, "index.html"))

    @app.get("/app", tags=["Frontend"])
    @app.get("/admin", tags=["Frontend"])
    @app.get("/article/{full_path:path}", tags=["Frontend"])
    @app.get("/app/{full_path:path}", tags=["Frontend"])
    async def serve_react_app(full_path: str = ""):
        return FileResponse(os.path.join(dist_dir, "index.html"))
