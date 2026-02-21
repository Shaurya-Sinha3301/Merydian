from typing import Generic, TypeVar, List
from fastapi import Query
from pydantic import BaseModel

T = TypeVar("T")

class PaginationParams:
    """
    Dependency for pagination parameters.
    """
    def __init__(
        self,
        skip: int = Query(0, ge=0, description="Items to skip"),
        limit: int = Query(10, ge=1, le=100, description="Items per page"),
    ):
        self.skip = skip
        self.limit = limit

class PaginatedResponse(BaseModel, Generic[T]):
    """
    Generic response model for paginated data.
    """
    items: List[T]
    total: int
    skip: int
    limit: int
