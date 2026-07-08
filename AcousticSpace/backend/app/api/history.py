from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database.models import History

router = APIRouter()


@router.get("/")
def get_history(db: Session = Depends(get_db)):
    """
    Get all previous analysis history.
    """

    history = (
        db.query(History)
        .order_by(History.created_at.desc())
        .all()
    )

    return {
        "success": True,
        "count": len(history),
        "history": history
    }


@router.get("/{history_id}")
def get_history_by_id(
    history_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a single history record.
    """

    record = (
        db.query(History)
        .filter(History.id == history_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="History record not found."
        )

    return {
        "success": True,
        "history": record
    }


@router.delete("/{history_id}")
def delete_history(
    history_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete one history record.
    """

    record = (
        db.query(History)
        .filter(History.id == history_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="History record not found."
        )

    db.delete(record)
    db.commit()

    return {
        "success": True,
        "message": "History deleted successfully."
    }


@router.delete("/")
def clear_history(db: Session = Depends(get_db)):
    """
    Delete all history records.
    """

    db.query(History).delete()
    db.commit()

    return {
        "success": True,
        "message": "All history cleared successfully."
    }