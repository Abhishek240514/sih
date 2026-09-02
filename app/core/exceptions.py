from typing import Any, Dict, Optional
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = {}


class ErrorResponse(BaseModel):
    error: ErrorDetail


class ForensicsException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ):
        self.code = code
        self.message = message
        self.details = details or {}
        self.status_code = status_code
        super().__init__(message)


class DatasetInvalidError(ForensicsException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="DATASET_INVALID",
            message=message,
            details=details,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class DatasetNotFoundError(ForensicsException):
    def __init__(self, dataset_id: str):
        super().__init__(
            code="DATASET_NOT_FOUND",
            message=f"Dataset {dataset_id} not found",
            details={"dataset_id": dataset_id},
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ModelNotTrainedError(ForensicsException):
    def __init__(self):
        super().__init__(
            code="MODEL_NOT_TRAINED",
            message="ML model has not been trained yet",
            details={},
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class EntityNotFoundError(ForensicsException):
    def __init__(self, entity_id: str, entity_type: str = "entity"):
        super().__init__(
            code="ENTITY_NOT_FOUND",
            message=f"{entity_type.capitalize()} {entity_id} not found",
            details={"entity_id": entity_id, "entity_type": entity_type},
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ProcessingError(ForensicsException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="PROCESSING_ERROR",
            message=message,
            details=details,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class ValidationError(ForensicsException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            details=details,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )


class FileTooLargeError(ForensicsException):
    def __init__(self, max_size: int):
        super().__init__(
            code="FILE_TOO_LARGE",
            message=f"File size exceeds maximum allowed size of {max_size} bytes",
            details={"max_size": max_size},
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )


class UnsupportedFormatError(ForensicsException):
    def __init__(self, format: str):
        super().__init__(
            code="UNSUPPORTED_FORMAT",
            message=f"Unsupported file format: {format}",
            details={"format": format},
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        )


async def forensics_exception_handler(
    request: Request, exc: ForensicsException
) -> JSONResponse:
    logger.error(
        f"Forensics error: {exc.code} - {exc.message}",
        extra={"extra_fields": {"details": exc.details, "path": str(request.url)}},
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=ErrorDetail(code=exc.code, message=exc.message, details=exc.details)
        ).model_dump(),
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    logger.error(
        f"HTTP error: {exc.status_code} - {exc.detail}",
        extra={"extra_fields": {"path": str(request.url)}},
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=ErrorDetail(
                code="HTTP_ERROR", message=str(exc.detail), details={}
            )
        ).model_dump(),
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        f"Unhandled exception: {type(exc).__name__}",
        extra={"extra_fields": {"path": str(request.url)}},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error=ErrorDetail(
                code="INTERNAL_ERROR",
                message="An internal server error occurred",
                details={},
            )
        ).model_dump(),
    )