from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Generator

from app.db.database import get_db_session, SessionLocal
from app.core.config import settings


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_dataset_access(dataset_id: str, db: Session = Depends(get_db)) -> str:
    from app.db.repository import DatasetRepository
    repo = DatasetRepository(db)
    dataset = repo.get(dataset_id)
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset {dataset_id} not found"
        )
    return dataset_id


def get_pagination_params(
    skip: int = 0,
    limit: int = 100,
) -> dict:
    return {"skip": max(0, skip), "limit": min(max(1, limit), 1000)}