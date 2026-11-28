"""
Server launcher for Verdicts AI.
Runs FastAPI on port 8088.
"""

import uvicorn
from app.config import get_settings

settings = get_settings()

if __name__ == "__main__":
    print(f"Starting {settings.APP_NAME} on http://{settings.HOST}:{settings.PORT}")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        backlog=4096,
    )
