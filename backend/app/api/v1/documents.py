from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.core.config import settings
from app.models.document import Document, DocumentStatus
from app.models.loan import Loan
from app.models.user import User

router = APIRouter(tags=["Documents"])


# ---------------------------------------------------------------------------
# Schemas (defined inline to keep this module self-contained)
# ---------------------------------------------------------------------------

class DocumentCreateRequest(BaseModel):
    document_type: str
    original_filename: str


class DocumentUpdateRequest(BaseModel):
    document_status: Optional[DocumentStatus] = None
    s3_key: Optional[str] = None


class DocumentResponse(BaseModel):
    id: UUID
    loan_id: UUID
    document_type: str
    document_status: DocumentStatus
    original_filename: str
    s3_key: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PresignedUploadResponse(BaseModel):
    upload_url: str
    s3_key: str
    expires_in_seconds: int = 900  # 15 minutes


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

async def _get_loan_or_404(loan_id: UUID, db: AsyncSession) -> Loan:
    result = await db.execute(select(Loan).where(Loan.id == loan_id))
    loan = result.scalar_one_or_none()
    if loan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Loan with id={loan_id} not found.",
        )
    return loan


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get(
    "/loans/{loan_id}/documents",
    response_model=List[DocumentResponse],
    status_code=status.HTTP_200_OK,
)
async def list_documents(
    loan_id: UUID,
    document_type: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[DocumentResponse]:
    """
    List all documents associated with a given loan.
    Optionally filter by document_type.
    """
    await _get_loan_or_404(loan_id, db)

    query = select(Document).where(Document.loan_id == loan_id)
    if document_type:
        query = query.where(Document.document_type == document_type)
    query = query.order_by(Document.created_at.desc())

    result = await db.execute(query)
    documents = result.scalars().all()
    return [DocumentResponse.model_validate(doc) for doc in documents]


@router.post(
    "/loans/{loan_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_document_record(
    loan_id: UUID,
    payload: DocumentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> DocumentResponse:
    """
    Create a document metadata record for a loan.
    The actual file upload is handled client-side via a presigned S3 URL.
    Use GET /loans/{loan_id}/documents/upload-url to obtain the upload URL.
    """
    await _get_loan_or_404(loan_id, db)

    document = Document(
        loan_id=loan_id,
        document_type=payload.document_type,
        document_status=DocumentStatus.REQUESTED,
        original_filename=payload.original_filename,
        uploaded_by_id=current_user.id,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return DocumentResponse.model_validate(document)


@router.get(
    "/loans/{loan_id}/documents/upload-url",
    response_model=PresignedUploadResponse,
    status_code=status.HTTP_200_OK,
)
async def get_presigned_upload_url(
    loan_id: UUID,
    filename: str = Query(..., description="Original filename for the document"),
    content_type: str = Query(
        default="application/octet-stream",
        description="MIME type of the file",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PresignedUploadResponse:
    """
    Generate a pre-signed S3 upload URL for direct browser-to-S3 uploads.
    The URL is valid for 15 minutes.

    After uploading, update the document record with the returned s3_key
    and set document_status to RECEIVED.
    """
    await _get_loan_or_404(loan_id, db)

    # Construct S3 key with a path structure for easy organization
    import uuid as _uuid
    unique_id = _uuid.uuid4().hex[:8]
    safe_filename = filename.replace(" ", "_").replace("..", "")
    s3_key = f"loans/{loan_id}/documents/{unique_id}/{safe_filename}"

    # Generate presigned URL if AWS is configured
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        import boto3
        from botocore.exceptions import ClientError

        s3_client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        try:
            upload_url = s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": settings.AWS_S3_BUCKET,
                    "Key": s3_key,
                    "ContentType": content_type,
                },
                ExpiresIn=900,
            )
        except ClientError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to generate upload URL: {e}",
            )
    else:
        # Development fallback: return a placeholder URL
        upload_url = (
            f"http://localhost:9000/{settings.AWS_S3_BUCKET}/{s3_key}"
            f"?x-dev-placeholder=true"
        )

    return PresignedUploadResponse(
        upload_url=upload_url,
        s3_key=s3_key,
        expires_in_seconds=900,
    )


@router.patch(
    "/loans/{loan_id}/documents/{document_id}",
    response_model=DocumentResponse,
    status_code=status.HTTP_200_OK,
)
async def update_document(
    loan_id: UUID,
    document_id: UUID,
    payload: DocumentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> DocumentResponse:
    """
    Update document status and/or s3_key after upload completion.
    """
    await _get_loan_or_404(loan_id, db)

    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.loan_id == loan_id,
        )
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with id={document_id} not found on loan {loan_id}.",
        )

    if payload.document_status is not None:
        document.document_status = payload.document_status
        if payload.document_status == DocumentStatus.RECEIVED and document.uploaded_at is None:
            from datetime import datetime, timezone
            document.uploaded_at = datetime.now(timezone.utc)
        elif payload.document_status in (DocumentStatus.REVIEWED, DocumentStatus.ACCEPTED, DocumentStatus.REJECTED):
            from datetime import datetime, timezone
            document.reviewed_at = datetime.now(timezone.utc)
            document.reviewed_by_id = current_user.id
    if payload.s3_key is not None:
        document.s3_key = payload.s3_key

    await db.commit()
    await db.refresh(document)
    return DocumentResponse.model_validate(document)


@router.post(
    "/loans/{loan_id}/documents/{document_id}/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_200_OK,
)
async def upload_document_file(
    loan_id: UUID,
    document_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> DocumentResponse:
    """
    Upload a file for an existing document record (local dev filesystem storage).

    In production use the presigned S3 URL flow instead. Here the file is
    saved under LOCAL_UPLOAD_DIR and the document is marked RECEIVED.
    """
    await _get_loan_or_404(loan_id, db)

    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.loan_id == loan_id,
        )
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {document_id} not found on loan {loan_id}.",
        )

    # Sanitise filename
    original = file.filename or "upload"
    safe_name = "".join(
        c if (c.isalnum() or c in "._-") else "_" for c in original
    )

    dest_dir = (
        Path(settings.LOCAL_UPLOAD_DIR)
        / str(loan_id)
        / str(document_id)
    )
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / safe_name

    contents = await file.read()
    dest_path.write_bytes(contents)

    document.s3_key = f"local://{loan_id}/{document_id}/{safe_name}"
    document.document_status = DocumentStatus.RECEIVED
    document.uploaded_at = datetime.now(timezone.utc)
    document.uploaded_by_id = current_user.id

    await db.commit()
    await db.refresh(document)
    return DocumentResponse.model_validate(document)


@router.get(
    "/loans/{loan_id}/documents/{document_id}/file",
    status_code=status.HTTP_200_OK,
)
async def download_document_file(
    loan_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> FileResponse:
    """
    Stream a locally stored document file back to the client.
    """
    await _get_loan_or_404(loan_id, db)

    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.loan_id == loan_id,
        )
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {document_id} not found on loan {loan_id}.",
        )

    if not document.s3_key or not document.s3_key.startswith("local://"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No locally stored file for this document.",
        )

    relative = document.s3_key[len("local://"):]
    file_path = Path(settings.LOCAL_UPLOAD_DIR) / relative

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server filesystem.",
        )

    return FileResponse(
        path=str(file_path),
        filename=document.original_filename,
        media_type="application/octet-stream",
    )


@router.delete(
    "/loans/{loan_id}/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_document(
    loan_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """
    Delete a document record (and its local file if present).
    """
    await _get_loan_or_404(loan_id, db)

    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.loan_id == loan_id,
        )
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {document_id} not found on loan {loan_id}.",
        )

    if document.s3_key and document.s3_key.startswith("local://"):
        relative = document.s3_key[len("local://"):]
        file_path = Path(settings.LOCAL_UPLOAD_DIR) / relative
        if file_path.exists():
            file_path.unlink()

    await db.delete(document)
    await db.commit()
