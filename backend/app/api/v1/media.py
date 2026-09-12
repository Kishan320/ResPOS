from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.deps import get_current_user, resolve_organization_id, require_staff
from app.models.user import User
from app.services.media_service import save_upload

router = APIRouter()


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    entity: str = Form("misc"),
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
):
    """
    Upload an image. Stored under nested folders:
    uploads/org_{id}/{entity}/{YYYY}/{MM}/{uuid}.ext
    """
    # Super admin without org can still upload under platform/
    result = await save_upload(file, organization_id=org_id, entity=entity)
    return {"message": "Uploaded", **result}
