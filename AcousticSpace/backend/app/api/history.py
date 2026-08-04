"""History API.

Endpoints:
- GET /api/history
- GET /api/history/{history_id}
- DELETE /api/history/{history_id}
- DELETE /api/history

This module returns DB-stored History items as JSON using response schemas.
"""

from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.schemas import (
    DeleteResponse,
    HistoryItem,
    HistoryListResponse,
    HistorySingleResponse,
)
from app.core.exceptions import DatabaseError
from app.core.logger import log_error, log_history_cleared, log_history_retrieved, log_info, log_warning
from app.database.db import get_db
from app.database.models import History

router = APIRouter()


def _to_item(record: History) -> HistoryItem:
    """Convert a History database model to a HistoryItem schema."""
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


@router.get(
    "/",
    response_model=HistoryListResponse,
    summary="Get all history records",
    description="Retrieve all audio analysis and prediction history records, ordered by most recent first.",
    responses={
        200: {"description": "History records retrieved successfully"},
        500: {"description": "Database error occurred"},
    }
)
def get_history(req: Request, db: Session = Depends(get_db)) -> HistoryListResponse:
    """Get all previous analysis/prediction records.
    
    Parameters
    ----------
    req : Request
        The FastAPI request object.
    db : Session
        Database session dependency.
        
    Returns
    -------
    HistoryListResponse
        List of all history records with metadata.
    """
    
    try:
        history_records: List[History] = db.query(History).order_by(History.created_at.desc()).all()
        items = [_to_item(r) for r in history_records]
        
        log_history_retrieved(len(items))
        
        return HistoryListResponse(
            success=True,
            message="History retrieved successfully.",
            data={
                "total_records": len(items),
                "oldest_record": items[-1].created_at if items else None,
                "newest_record": items[0].created_at if items else None,
            },
            count=len(items),
            history=items,
        )
    except SQLAlchemyError as exc:
        log_error(f"Database error while fetching history: {exc}", exc_info=True)
        raise DatabaseError(
            message="Failed to retrieve history.",
            detail=f"Database error: {str(exc)}"
        )
    except Exception as exc:
        log_error(f"Unexpected error while fetching history: {exc}", exc_info=True)
        raise DatabaseError(
            message="Failed to retrieve history.",
            detail=f"Unexpected error: {str(exc)}"
        )


@router.get(
    "/{history_id}",
    response_model=HistorySingleResponse,
    summary="Get history record by ID",
    description="Retrieve a specific history record by its ID.",
    responses={
        200: {"description": "History record found"},
        404: {"description": "History record not found"},
        500: {"description": "Database error occurred"},
    }
)
def get_history_by_id(history_id: int, req: Request, db: Session = Depends(get_db)) -> HistorySingleResponse:
    """Get a single history record.
    
    Parameters
    ----------
    history_id : int
        The ID of the history record to retrieve.
    req : Request
        The FastAPI request object.
    db : Session
        Database session dependency.
        
    Returns
    -------
    HistorySingleResponse
        The requested history record.
        
    Raises
    ------
    HTTPException
        404 if the record is not found.
    """
    
    try:
        record = db.query(History).filter(History.id == history_id).first()
        if not record:
            log_warning(f"History record not found: id={history_id}")
            raise HTTPException(
                status_code=404,
                detail=f"History record with id={history_id} not found."
            )
        
        # Ensure we return a proper response
        log_info(
            "History record retrieved",
            extra={
                "path": req.url.path,
                "history_id": history_id,
            }
        )
        log_history_retrieved(1)

        return HistorySingleResponse(
            success=True,
            message="History record retrieved successfully.",
            data={
                "retrieved_at": record.created_at.isoformat() if record.created_at else None,
            },
            history=_to_item(record),
        )
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        log_error(f"Database error while fetching history record {history_id}: {exc}", exc_info=True)
        raise DatabaseError(
            message="Failed to retrieve history record.",
            detail=f"Database error: {str(exc)}"
        )
    except Exception as exc:
        log_error(f"Unexpected error while fetching history record {history_id}: {exc}", exc_info=True)
        raise DatabaseError(
            message="Failed to retrieve history record.",
            detail=f"Unexpected error: {str(exc)}"
        )


@router.delete(
    "/{history_id}",
    response_model=DeleteResponse,
    summary="Delete history record",
    description="Delete a specific history record by its ID.",
    responses={
        200: {"description": "History record deleted successfully"},
        404: {"description": "History record not found"},
        500: {"description": "Database error occurred"},
    }
)
def delete_history(history_id: int, req: Request, db: Session = Depends(get_db)) -> DeleteResponse:
    """Delete one history record.
    
    Parameters
    ----------
    history_id : int
        The ID of the history record to delete.
    req : Request
        The FastAPI request object.
    db : Session
        Database session dependency.
        
    Returns
    -------
    DeleteResponse
        Confirmation message.
        
    Raises
    ------
    HTTPException
        404 if the record is not found.
    """
    
    try:
        record = db.query(History).filter(History.id == history_id).first()
        if not record:
            log_warning(f"History record not found for deletion: id={history_id}")
            raise HTTPException(
                status_code=404,
                detail=f"History record with id={history_id} not found."
            )

        filename = record.filename
        db.delete(record)
        db.commit()

        log_info(
            "History record deleted",
            extra={
                "path": req.url.path,
                "history_id": history_id,
                "filename": filename,
            }
        )
        log_history_cleared(1)

        return DeleteResponse(
            message="History deleted successfully.",
            data={
                "deleted_id": history_id,
                "deleted_filename": filename,
            }
        )
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        log_error(f"Database error while deleting history record {history_id}: {exc}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            message="Failed to delete history record.",
            detail=f"Database error: {str(exc)}"
        )
    except Exception as exc:
        log_error(f"Unexpected error while deleting history record {history_id}: {exc}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            message="Failed to delete history record.",
            detail=f"Unexpected error: {str(exc)}"
        )


@router.delete(
    "/",
    response_model=DeleteResponse,
    summary="Clear all history",
    description="Delete all history records. This action cannot be undone.",
    responses={
        200: {"description": "All history cleared successfully"},
        500: {"description": "Database error occurred"},
    }
)
def clear_history(req: Request, db: Session = Depends(get_db)) -> DeleteResponse:
    """Delete all history records.
    
    Parameters
    ----------
    req : Request
        The FastAPI request object.
    db : Session
        Database session dependency.
        
    Returns
    -------
    DeleteResponse
        Confirmation message.
    """
    
    try:
        # Get count before deletion for logging
        count = db.query(History).count()
        
        db.query(History).delete()
        db.commit()

        log_history_cleared(count)

        return DeleteResponse(
            message="All history cleared successfully.",
            data={
                "deleted_count": count,
            }
        )
    except SQLAlchemyError as exc:
        log_error(f"Database error while clearing history: {exc}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            message="Failed to clear history.",
            detail=f"Database error: {str(exc)}"
        )
    except Exception as exc:
        log_error(f"Unexpected error while clearing history: {exc}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            message="Failed to clear history.",
            detail=f"Unexpected error: {str(exc)}"
        )

