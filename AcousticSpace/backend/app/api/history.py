"""History API.

Endpoints:
- GET /api/history
- GET /api/history/{history_id}
- DELETE /api/history/{history_id}
- DELETE /api/history

This module returns DB-stored History items as JSON using response schemas.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.schemas import (
    DeleteResponse,
    HistoryItem,
    HistoryListResponse,
    HistorySingleResponse,
)
from app.database.db import get_db
from app.database.models import History

router = APIRouter()


def _to_item(record: History) -> HistoryItem:
    return HistoryItem(
        id=record.id,
        filename=record.filename,
        original_filename=record.original_filename,
        file_path=record.file_path,
        duration=record.duration,
        sample_rate=record.sample_rate,
        prediction=record.prediction,
        confidence=record.confidence,
        processing_time=record.processing_time,
        created_at=record.created_at.isoformat() if record.created_at is not None else None,
    )


@router.get("/", response_model=HistoryListResponse)
def get_history(db: Session = Depends(get_db)) -> HistoryListResponse:
    """Get all previous analysis/prediction records."""

    history = db.query(History).order_by(History.created_at.desc()).all()
    items = [_to_item(r) for r in history]
    return HistoryListResponse(count=len(items), history=items)


@router.get("/{history_id}", response_model=HistorySingleResponse)
def get_history_by_id(history_id: int, db: Session = Depends(get_db)) -> HistorySingleResponse:
    """Get a single history record."""

    record = db.query(History).filter(History.id == history_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="History record not found.")

    return HistorySingleResponse(history=_to_item(record))


@router.delete("/{history_id}", response_model=DeleteResponse)
def delete_history(history_id: int, db: Session = Depends(get_db)) -> DeleteResponse:
    """Delete one history record."""

    record = db.query(History).filter(History.id == history_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="History record not found.")

    db.delete(record)
    db.commit()

    return DeleteResponse(message="History deleted successfully.")


@router.delete("/", response_model=DeleteResponse)
def clear_history(db: Session = Depends(get_db)) -> DeleteResponse:
    """Delete all history records."""

    db.query(History).delete()
    db.commit()

    return DeleteResponse(message="All history cleared successfully.")

