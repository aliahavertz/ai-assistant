
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Boolean,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ==================================
# USERS TABLE
# ==================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    conversations = relationship(
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    library_folders = relationship(
        "LibraryFolder",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    library_items = relationship(
        "LibraryItem",
        back_populates="user",
        cascade="all, delete-orphan",
    )


# ==================================
# CONVERSATIONS TABLE
# ==================================

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, default="New Conversation")
    is_pinned = Column(Boolean, default=False, nullable=False)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user = relationship(
        "User",
        back_populates="conversations",
    )

    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


# ==================================
# MESSAGES TABLE
# ==================================

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id"),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    conversation = relationship(
        "Conversation",
        back_populates="messages",
    )


# ==================================
# LIBRARY FOLDERS TABLE
# ==================================

class LibraryFolder(Base):
    __tablename__ = "library_folders"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship(
        "User",
        back_populates="library_folders",
    )

    items = relationship(
        "LibraryItem",
        back_populates="folder",
    )


# ==================================
# LIBRARY ITEMS TABLE
# ==================================

class LibraryItem(Base):
    __tablename__ = "library_items"

    id = Column(Integer, primary_key=True, index=True)

    # Types: response, conversation, note
    item_type = Column(String(20), nullable=False)

    title = Column(String(200), nullable=False)

    # Snapshot allows saved content to remain available
    # even if the original conversation/message is deleted.
    content_snapshot = Column(Text, nullable=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    folder_id = Column(
        Integer,
        ForeignKey("library_folders.id", ondelete="SET NULL"),
        nullable=True,
    )

    message_id = Column(
        Integer,
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True,
    )

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship(
        "User",
        back_populates="library_items",
    )

    folder = relationship(
        "LibraryFolder",
        back_populates="items",
    )
