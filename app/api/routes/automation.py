"""
Autonomous Automation Daemon API Route.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from app.services.scheduler_service import automation_manager

router = APIRouter(prefix="/automation", tags=["Automation"])


class StartAutomationRequest(BaseModel):
    interval_seconds: int = 300
    daily_target: int = 200


@router.get("/status")
def get_automation_status():
    return automation_manager.get_status()


@router.post("/start")
async def start_automation(req: StartAutomationRequest):
    started = await automation_manager.start(
        interval_seconds=req.interval_seconds,
        daily_target=req.daily_target
    )
    return {"status": "started" if started else "already_running"}


@router.post("/stop")
async def stop_automation():
    stopped = await automation_manager.stop()
    return {"status": "stopped" if stopped else "failed"}


@router.post("/trigger-single")
async def trigger_single_run():
    """Immediately dispatches 1 autonomous cycle with random AI topic selection."""
    res = await automation_manager.execute_single_autonomous_iteration()
    return {"status": "dispatched", "result": res}


@router.post("/reset-counter")
def reset_daily_counter():
    """Manually resets the 24-hour generated articles counter."""
    res = automation_manager.reset_counter()
    return {"message": "Daily article counter reset successfully", "status": res}
