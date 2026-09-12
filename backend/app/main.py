"""
Rathin POS API
Multi-tenant Point of Sale for restaurants, cafes, grocery, kirana and retail.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
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
    description="Rathin POS - multi-tenant point of sale for restaurant and retail organizations",
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


@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.app_name}",
        "docs": "/docs",
        "api": settings.api_prefix,
        "health": "/health",
        "media": "/media/",
    }
