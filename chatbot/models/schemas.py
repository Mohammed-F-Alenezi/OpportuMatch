# chatbot/models/schemas.py
from typing import Optional
from pydantic import BaseModel

class RagInitIn(BaseModel):
    match_result_id: str
    idea_description: Optional[str] = None

class RagChatIn(BaseModel):
    match_result_id: str
    message: str
    idea_description: Optional[str] = None
    tech_depth: Optional[bool] = False

class RagSummaryIn(BaseModel):
    match_result_id: str

class RagTestIn(BaseModel):
    match_result_id: Optional[str] = None
    write: bool = False
