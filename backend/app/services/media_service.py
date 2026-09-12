"""
Local media storage with nested folders:

  uploads/
    org_{organization_id}/
      {entity}/          # products | categories | organizations | users | misc
        {YYYY}/
          {MM}/
            {uuid}{ext}

Paths stored in DB as relative: org_1/products/2026/08/abc.jpg
Public URL: /media/org_1/products/2026/08/abc.jpg
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile, status

# backend/uploads  (sibling of app/)
UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads"
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp"}
ALLOWED_MIME = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/bmp",
    "application/octet-stream",
}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB

ENTITY_RE = re.compile(r"^[a-z][a-z0-9_]{0,40}$")


def ensure_upload_root() -> Path:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    return UPLOAD_ROOT


def _safe_entity(entity: str) -> str:
    entity = (entity or "misc").lower().strip()
    if not ENTITY_RE.match(entity):
        raise HTTPException(status_code=400, detail="Invalid entity type for media")
    return entity


def build_relative_path(organization_id: Optional[int], entity: str, filename: str) -> Path:
    entity = _safe_entity(entity)
    now = datetime.now(timezone.utc)
    org_part = f"org_{organization_id}" if organization_id else "platform"
    ext = Path(filename).suffix.lower() or ".bin"
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXT))}",
        )
    name = f"{uuid.uuid4().hex}{ext}"
    return Path(org_part) / entity / f"{now.year:04d}" / f"{now.month:02d}" / name


async def save_upload(
    file: UploadFile,
    *,
    organization_id: Optional[int],
    entity: str = "misc",
) -> dict:
    ensure_upload_root()
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")

    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_MIME and not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Unsupported content type: {content_type}")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 8MB)")

    rel = build_relative_path(organization_id, entity, file.filename)
    abs_path = UPLOAD_ROOT / rel
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.write_bytes(data)

    rel_str = rel.as_posix()
    return {
        "path": rel_str,
        "url": f"/media/{rel_str}",
        "filename": file.filename,
        "size": len(data),
        "content_type": content_type or "image/*",
        "entity": _safe_entity(entity),
        "organization_id": organization_id,
    }


def delete_media(relative_path: Optional[str]) -> bool:
    if not relative_path:
        return False
    # Prevent path traversal
    clean = Path(relative_path.replace("\\", "/"))
    if ".." in clean.parts or clean.is_absolute():
        raise HTTPException(status_code=400, detail="Invalid media path")
    target = (UPLOAD_ROOT / clean).resolve()
    try:
        target.relative_to(UPLOAD_ROOT.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid media path")
    if target.is_file():
        target.unlink()
        return True
    return False
