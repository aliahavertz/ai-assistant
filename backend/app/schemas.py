
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal, Optional


# ==================================
# USER SCHEMAS
# ==================================

class UserCreate(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=50,
    )
    email: str = Field(
        min_length=5,
        max_length=255,
    )


class UserResponse(BaseModel):
    id: int
    username: str
    email: str

    model_config = ConfigDict(from_attributes=True)


# ==================================
# CONVERSATION SCHEMAS
# ==================================

class ConversationCreate(BaseModel):
    title: str = Field(
        default="New Conversation",
        max_length=200,
    )


class ConversationUpdate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=200,
    )


class ConversationResponse(BaseModel):
    id: int
    title: str
    user_id: int
    is_pinned: bool = False

    model_config = ConfigDict(from_attributes=True)


# ==================================
# MESSAGE SCHEMAS
# ==================================

class MessageCreate(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    conversation_id: int

    model_config = ConfigDict(from_attributes=True)


# ==================================
# AI CHAT SCHEMAS
# ==================================

class ChatRequest(BaseModel):
    prompt: str = Field(
        min_length=1,
        max_length=10000,
    )


class ChatResponse(BaseModel):
    answer: str


# ==================================
# LIBRARY FOLDER SCHEMAS
# ==================================

class LibraryFolderCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100,
    )


class LibraryFolderUpdate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100,
    )


class LibraryFolderResponse(BaseModel):
    id: int
    name: str
    user_id: int

    model_config = ConfigDict(from_attributes=True)


# ==================================
# LIBRARY ITEM SCHEMAS
# ==================================

class LibraryItemCreate(BaseModel):
    item_type: Literal["response", "conversation", "note"]

    title: str = Field(
        min_length=1,
        max_length=200,
    )

    content_snapshot: Optional[str] = None

    folder_id: Optional[int] = None

    message_id: Optional[int] = None

    conversation_id: Optional[int] = None


class LibraryItemUpdate(BaseModel):
    title: Optional[str] = Field(
        default=None,
        max_length=200,
    )

    folder_id: Optional[int] = None

    content_snapshot: Optional[str] = None


class LibraryItemResponse(BaseModel):
    id: int
    item_type: str
    title: str
    content_snapshot: Optional[str] = None
    user_id: int
    folder_id: Optional[int] = None
    message_id: Optional[int] = None
    conversation_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
