import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .config import CORS_ORIGINS
from .api.routes import router

app = FastAPI(
    title="UK Day-Ahead Renewable Analytics & Procurement Platform",
    description="Product tailored for UK energy utility traders buying wholesale electricity from the day-ahead market, analyzing Elexon BMRS wind generation forecasts and quantified error.",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(router)

# Mount static frontend build if it exists (for unified Docker / Heroku / production deployment)
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API routes to pass through
        if full_path.startswith("api"):
            return None
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    def index():
        return {
            "name": "UK Day-Ahead Renewable Analytics API",
            "docs": "/docs",
            "status": "online",
            "message": "Frontend build not detected in dist/. In development mode, run frontend via Vite."
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
