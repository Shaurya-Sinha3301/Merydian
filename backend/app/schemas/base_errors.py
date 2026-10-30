from typing import Optional, List, Any
from pydantic import BaseModel, Field

class ApiErrorResponse(BaseModel):
    """
    Standardized global error response for the frontend.
    """
    status: str = Field(default="FAILED", description="Status string, usually 'FAILED'")
    error_code: str = Field(..., description="Machine-readable error code")
    title: str = Field(..., description="Human-readable short title of the error")
    message: str = Field(..., description="Detailed description of the error")
    suggestions: Optional[List[str]] = Field(default=None, description="Actionable suggestions for the user")
