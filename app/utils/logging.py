"""
Logging utility for Verdicts AI using Rich.
"""

import logging
from rich.logging import RichHandler
from rich.console import Console

console = Console()

def setup_logging(debug: bool = True):
    log_level = logging.DEBUG if debug else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(rich_tracebacks=True, console=console)]
    )
    return logging.getLogger("verdicts_ai")

logger = setup_logging()
