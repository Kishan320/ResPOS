"""
DineFlow API
Multi-tenant Point of Sale for restaurants, cafes, grocery, kirana and retail.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, ORJSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.services.media_service import ensure_upload_root


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_upload_root()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="DineFlow - multi-tenant point of sale for restaurant and retail organizations",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Nested local media: /media/org_1/products/2026/08/uuid.jpg
upload_dir = ensure_upload_root()
app.mount("/media", StaticFiles(directory=str(upload_dir)), name="media")

app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "app": settings.app_name,
        "env": settings.app_env,
    }


# ── Serve React frontend (must be mounted AFTER all API routes) ──────────────
FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        """Catch-all: serve React index.html for any non-API route."""
        requested = FRONTEND_DIST / full_path
        if requested.is_file():
            return FileResponse(str(requested))
        return FileResponse(str(FRONTEND_DIST / "index.html"))
