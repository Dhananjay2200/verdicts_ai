"""
Verdicts AI - 200 Articles/Day Autonomous Legal Publishing Engine CLI.
Runs the continuous autonomous publisher with live console telemetry,
intelligent worldwide jurisdiction balance, anti-hallucination research, and auto-publishing.

Usage:
  python run_automation.py                  # Default: 200/day pacing (every 300s / 5 mins)
  python run_automation.py --interval 180   # Custom 3-min interval
  python run_automation.py --target 100     # Target 100 articles/day
  python run_automation.py --once           # Execute a single autonomous cycle and exit
"""

import argparse
import sys
import time
import asyncio
from app.services.scheduler_service import automation_manager
from app.utils.logging import logger

def print_banner(interval: int, target: int):
    print("=" * 70)
    print("  ⚖️  Verdicts AI — Autonomous Legal Publisher & Worldwide Wire  🏛️ ")
    print("=" * 70)
    print(f"  [*] Target Production : {target} verified legal dossiers / 24 hours")
    print(f"  [*] Automated Pacing  : 1 post every {interval}s ({round(interval/60, 2)} minutes)")
    print(f"  [*] Global Scope      : 10 worldwide apex jurisdictions (balanced round-robin)")
    print(f"  [*] Thematic Depth    : 12 legal categories (least-covered priority)")
    print(f"  [*] Quality Gate      : Score >= 8.0/10 (11-dimension judicial evaluation)")
    print(f"  [*] Content Mix       : 50% Landmark Verdicts / 50% Breaking Court Wire")
    print("=" * 70)
    print("  Press Ctrl+C to stop the autonomous engine gracefully at any time.")
    print("=" * 70 + "\n")

async def run_single_once():
    print("[*] Executing single autonomous legal publishing cycle...")
    res = await automation_manager.execute_single_autonomous_iteration()
    if res.get("success"):
        print(f"\n[+] SUCCESS! Published Article ID {res.get('article_id')}:")
        print(f"    Title        : {res.get('title')}")
        print(f"    Jurisdiction : {res.get('jurisdiction')}")
        print(f"    Type         : {res.get('article_type')}")
        print(f"    Score        : {res.get('score')}/10.0")
        sys.exit(0)
    else:
        print(f"\n[-] Cycle completed with status: {res.get('status')} ({res.get('error')})")
        sys.exit(1)

async def run_daemon(interval: int, target: int):
    print_banner(interval=interval, target=target)
    await automation_manager.start(interval_seconds=interval, daily_target=target)

    try:
        while True:
            status = automation_manager.get_status()
            today = status["articles_generated_today"]
            pct = status["progress_percent"]
            next_in = status["seconds_until_next_run"]
            successful = status["successful_runs"]
            total = status["total_runs"]

            bar_len = 20
            filled = int((pct / 100) * bar_len)
            bar = "#" * filled + "-" * (bar_len - filled)

            status_line = (
                f"\r[*] Progress: [{bar}] {today}/{target} ({pct}%) | "
                f"Runs: {successful}/{total} | "
                f"Next in: {next_in or 0}s   "
            )
            sys.stdout.write(status_line)
            sys.stdout.flush()
            await asyncio.sleep(1)

    except KeyboardInterrupt:
        print("\n\n[*] Ctrl+C received. Gracefully stopping Verdicts AI Autonomous Engine...")
        await automation_manager.stop()
        print("[+] Engine stopped cleanly. Have a great day!")
        sys.exit(0)

def main():
    parser = argparse.ArgumentParser(description="Verdicts AI Autonomous Publisher Engine")
    parser.add_argument("--interval", type=int, default=300, help="Seconds between runs (default: 300s = 5m)")
    parser.add_argument("--target", type=int, default=200, help="Target articles per day (default: 200)")
    parser.add_argument("--once", action="store_true", help="Run a single autonomous cycle and exit")
    args = parser.parse_args()

    if args.once:
        asyncio.run(run_single_once())
    else:
        asyncio.run(run_daemon(interval=args.interval, target=args.target))

if __name__ == "__main__":
    main()
