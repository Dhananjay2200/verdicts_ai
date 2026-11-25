"""
Verdicts AI - Autonomous Scheduler & Automation Manager Service.
Drives continuous automated generation of landmark judicial guides and worldwide legal news,
tracking quotas, daily limits, 24-hour reset windows, and interval cycles like GlobeTrotter AI.
"""

import asyncio
from datetime import datetime, date, timedelta, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.database.models import VerdictArticle, SystemSetting
from app.utils.logging import logger

_scheduler_task: Optional[asyncio.Task] = None
_stop_event = asyncio.Event()

class AutomationManager:
    def __init__(self):
        self.is_running: bool = False
        self.interval_seconds: int = 300
        self.daily_target: int = 200
        self.total_runs: int = 0
        self.successful_runs: int = 0
        self.failed_runs: int = 0
        self.last_run_at: Optional[datetime] = None
        self.next_run_at: Optional[datetime] = None
        self.last_run_result: Optional[Dict[str, Any]] = None
        self.last_reset_at: datetime = datetime.combine(date.today(), datetime.min.time())
        self.recent_logs: List[Dict[str, Any]] = []

    def get_articles_today_count(self) -> int:
        db = SessionLocal()
        try:
            today_start = datetime.combine(date.today(), datetime.min.time())
            effective_start = max(today_start, self.last_reset_at)
            count = db.query(VerdictArticle).filter(VerdictArticle.created_at >= effective_start).count()
            return count
        except Exception as e:
            logger.warning(f"Error checking today's articles: {e}")
            return 0
        finally:
            db.close()

    def reset_counter(self) -> Dict[str, Any]:
        """Manually resets the 24-hour daily articles counter."""
        self.last_reset_at = datetime.utcnow()
        logger.info("[Automation] Daily articles counter has been manually reset.")
        return self.get_status()

    def get_status(self) -> Dict[str, Any]:
        articles_today = self.get_articles_today_count()
        progress = round((articles_today / self.daily_target) * 100, 1) if self.daily_target > 0 else 0
        
        seconds_until = 0
        if self.is_running and self.next_run_at:
            delta = (self.next_run_at - datetime.utcnow()).total_seconds()
            seconds_until = max(0, int(delta))

        # Calculate time until next midnight UTC reset
        now_utc = datetime.now(timezone.utc)
        midnight_utc = (now_utc + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        seconds_until_reset = int((midnight_utc - now_utc).total_seconds())

        return {
            "is_running": self.is_running,
            "interval_seconds": self.interval_seconds,
            "interval_minutes": round(self.interval_seconds / 60, 2),
            "daily_target": self.daily_target,
            "articles_generated_today": articles_today,
            "progress_percent": min(100.0, progress),
            "seconds_until_next_run": seconds_until,
            "seconds_until_reset": seconds_until_reset,
            "current_cycle_date": now_utc.date().isoformat(),
            "total_runs": self.total_runs,
            "successful_runs": self.successful_runs,
            "failed_runs": self.failed_runs,
            "last_run_at": self.last_run_at.isoformat() if self.last_run_at else None,
            "next_run_at": self.next_run_at.isoformat() if self.next_run_at else None,
            "last_reset_at": self.last_reset_at.isoformat() if self.last_reset_at else None,
            "last_run_result": self.last_run_result,
        }

    async def execute_single_autonomous_iteration(self) -> Dict[str, Any]:
        """Executes a single cycle with 100% random AI selection across worldwide legal realms."""
        from app.graph.workflow import run_verdict_pipeline
        import random
        self.total_runs += 1
        self.last_run_at = datetime.utcnow()

        try:
            # Alternates between Landmark Verdict and Worldwide Legal News Wire
            article_type = "LEGAL_NEWS" if (self.total_runs % 2 == 0) else "VERDICT_BRIEF"
            logger.info(f"[Automation] Dispathing autonomous run #{self.total_runs}: type={article_type}")
            
            result = await run_verdict_pipeline(article_type=article_type)
            status = result.get("status")
            success = status in ("SUCCESS", "NOVEL_TOPIC", "NOVEL_NEWS_STORY") or bool(result.get("published_article_id"))

            if success:
                self.successful_runs += 1
                self.last_run_result = {
                    "success": True,
                    "status": "PUBLISHED",
                    "article_id": result.get("published_article_id"),
                    "title": result.get("article", {}).get("title"),
                    "jurisdiction": result.get("topic", {}).get("jurisdiction"),
                    "article_type": article_type,
                    "score": result.get("evaluation", {}).get("overall_score"),
                    "time": datetime.utcnow().isoformat()
                }
            else:
                self.failed_runs += 1
                self.last_run_result = {
                    "success": False,
                    "status": status or "FAILED",
                    "time": datetime.utcnow().isoformat()
                }

            return self.last_run_result
        except Exception as e:
            self.failed_runs += 1
            self.last_run_result = {
                "success": False,
                "error": str(e),
                "time": datetime.utcnow().isoformat()
            }
            logger.error(f"[Automation] Cycle failed: {e}")
            return self.last_run_result

    async def start(self, interval_seconds: int = 300, daily_target: int = 200) -> bool:
        global _scheduler_task, _stop_event
        if self.is_running:
            return True

        self.interval_seconds = interval_seconds
        self.daily_target = daily_target
        self.is_running = True
        _stop_event.clear()

        async def _worker():
            logger.info(f"Verdicts AI Autonomous Publisher Engine started (interval: {self.interval_seconds}s).")
            while not _stop_event.is_set():
                # Check quota
                today_count = self.get_articles_today_count()
                if today_count < self.daily_target:
                    await self.execute_single_autonomous_iteration()
                else:
                    logger.info(f"[Automation] Daily target of {self.daily_target} reached for today. Idling.")

                self.next_run_at = datetime.utcnow() + timedelta(seconds=self.interval_seconds)
                try:
                    await asyncio.wait_for(_stop_event.wait(), timeout=self.interval_seconds)
                except asyncio.TimeoutError:
                    pass
            self.is_running = False

        _scheduler_task = asyncio.create_task(_worker())
        return True

    async def stop(self) -> bool:
        global _scheduler_task, _stop_event
        if not self.is_running:
            return True
        _stop_event.set()
        if _scheduler_task:
            _scheduler_task.cancel()
        self.is_running = False
        self.next_run_at = None
        logger.info("Verdicts AI Autonomous Publisher Engine stopped.")
        return True


automation_manager = AutomationManager()
