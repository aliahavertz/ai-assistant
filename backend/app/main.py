
import logging

logger = logging.getLogger(__name__)

from dotenv import load_dotenv

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from contextlib import asynccontextmanager

from app.database import engine, Base, get_db
from app import models, schemas
from app.ai_service import generate_ai_response
from app.schemas import ChatRequest

from fastapi.middleware.cors import CORSMiddleware
# ==================================
# APPLICATION STARTUP
# ==================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="AI Assistant API",
    description="Backend API for our AI-powered application",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ==================================
# HOME AND HEALTH CHECKS
# ==================================

@app.get("/")
def home():
    return {
        "message": "Welcome to AI Assistant API!",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/health/db")
def database_health_check(db: Session = Depends(get_db)):
    from sqlalchemy import text

    db.execute(text("SELECT 1"))

    return {
        "status": "connected",
        "database": "PostgreSQL"
    }


# ==================================
# USER ENDPOINTS
# ==================================

@app.post(
    "/users",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED
)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = db.query(models.User).filter(
        (models.User.username == user.username) |
        (models.User.email == user.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Username or email already exists"
        )

    new_user = models.User(
        username=user.username,
        email=user.email
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@app.get(
    "/users/{user_id}",
    response_model=schemas.UserResponse
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = db.get(models.User, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user


# ==================================
# CONVERSATION ENDPOINTS
# ==================================

@app.post(
    "/users/{user_id}/conversations",
    response_model=schemas.ConversationResponse,
    status_code=status.HTTP_201_CREATED
)
def create_conversation(
    user_id: int,
    conversation: schemas.ConversationCreate,
    db: Session = Depends(get_db)
):
    user = db.get(models.User, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    new_conversation = models.Conversation(
        title=conversation.title,
        user_id=user_id
    )

    db.add(new_conversation)
    db.commit()
    db.refresh(new_conversation)

    return new_conversation


@app.get(
    "/users/{user_id}/conversations",
    response_model=list[schemas.ConversationResponse]
)
def get_user_conversations(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = db.get(models.User, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return db.query(models.Conversation).filter(
        models.Conversation.user_id == user_id
    ).order_by(models.Conversation.id.desc()).all()


@app.get(
    "/conversations/{conversation_id}",
    response_model=schemas.ConversationResponse
)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db)
):
    conversation = db.get(
        models.Conversation,
        conversation_id
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    return conversation


# ==================================
# UPDATE CONVERSATION TITLE
# ==================================

@app.patch(
    "/conversations/{conversation_id}",
    response_model=schemas.ConversationResponse
)
def update_conversation(
    conversation_id: int,
    conversation: schemas.ConversationUpdate,
    db: Session = Depends(get_db)
):
    existing_conversation = db.get(
        models.Conversation,
        conversation_id
    )

    if not existing_conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    new_title = conversation.title.strip()

    if not new_title:
        raise HTTPException(
            status_code=422,
            detail="Conversation title cannot be empty"
        )

    existing_conversation.title = new_title

    db.commit()
    db.refresh(existing_conversation)

    return existing_conversation


# ==================================
# DELETE CONVERSATION
# ==================================

@app.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_200_OK
)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db)
):
    conversation = db.get(
        models.Conversation,
        conversation_id
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    # Delete all messages belonging to this conversation
    db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id
    ).delete(synchronize_session=False)

    # Delete the conversation
    db.delete(conversation)

    db.commit()

    return {
        "message": "Conversation deleted successfully",
        "conversation_id": conversation_id
    }

# ==================================
# MESSAGE ENDPOINTS
# ==================================

@app.post(
    "/conversations/{conversation_id}/messages",
    response_model=schemas.MessageResponse,
    status_code=status.HTTP_201_CREATED
)
def create_message(
    conversation_id: int,
    message: schemas.MessageCreate,
    db: Session = Depends(get_db)
):
    conversation = db.get(
        models.Conversation,
        conversation_id
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    new_message = models.Message(
        role=message.role,
        content=message.content,
        conversation_id=conversation_id
    )

    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    return new_message


@app.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[schemas.MessageResponse]
)
def get_messages(
    conversation_id: int,
    db: Session = Depends(get_db)
):
    conversation = db.get(
        models.Conversation,
        conversation_id
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    return db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id
    ).order_by(models.Message.id.asc()).all()


# ==================================
# PERSISTENT AI CHAT ENDPOINT
# ==================================

@app.post("/chat/ask")
def ask_ai(
    request: ChatRequest,
    conversation_id: int,
    db: Session = Depends(get_db)
):

    # Find the conversation
    conversation = db.get(
        models.Conversation,
        conversation_id
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    try:
        # Save the user's message
        user_message = models.Message(
            role="user",
            content=request.prompt,
            conversation_id=conversation_id
        )

        db.add(user_message)
        db.commit()
        db.refresh(user_message)

        # Generate Gemini response
        answer = generate_ai_response(request.prompt)

        # Save the AI response
        assistant_message = models.Message(
            role="assistant",
            content=answer,
            conversation_id=conversation_id
        )

        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)

        return {
            "conversation_id": conversation_id,
            "user_message": {
                "id": user_message.id,
                "role": user_message.role,
                "content": user_message.content
            },
            "assistant_message": {
                "id": assistant_message.id,
                "role": assistant_message.role,
                "content": assistant_message.content
            }
        }

    except Exception:
        db.rollback()
        logger.exception("Persistent AI chat failed")

        raise HTTPException(
            status_code=502,
            detail="Unable to process your AI chat request"
        )


# ==================================
# REGENERATE AI RESPONSE ENDPOINT
# ==================================

@app.post("/chat/regenerate")
def regenerate_ai_response(
    conversation_id: int,
    db: Session = Depends(get_db)
):
    # Find the conversation
    conversation = db.get(
        models.Conversation,
        conversation_id
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    try:
        # Find the latest assistant message
        assistant_message = db.query(models.Message).filter(
            models.Message.conversation_id == conversation_id,
            models.Message.role == "assistant"
        ).order_by(
            models.Message.id.desc()
        ).first()

        if not assistant_message:
            raise HTTPException(
                status_code=400,
                detail="No assistant response to regenerate"
            )

        # Find the latest user message before this assistant response
        user_message = db.query(models.Message).filter(
            models.Message.conversation_id == conversation_id,
            models.Message.role == "user",
            models.Message.id < assistant_message.id
        ).order_by(
            models.Message.id.desc()
        ).first()

        if not user_message:
            raise HTTPException(
                status_code=400,
                detail="Original user message not found"
            )

        # Generate a new Gemini response
        new_answer = generate_ai_response(user_message.content)

        # Replace the old assistant response
        assistant_message.content = new_answer

        db.commit()
        db.refresh(assistant_message)

        return {
            "conversation_id": conversation_id,
            "assistant_message": {
                "id": assistant_message.id,
                "role": assistant_message.role,
                "content": assistant_message.content,
                "conversation_id": assistant_message.conversation_id
            }
        }

    except HTTPException:
        raise

    except Exception:
        db.rollback()
        logger.exception("Regenerate AI response failed")

        raise HTTPException(
            status_code=502,
            detail="Unable to regenerate AI response"
        )


# ==================================
# EDIT AND RESEND MESSAGE ENDPOINT
# ==================================

@app.post("/chat/edit-resend/{message_id}")
def edit_and_resend_message(
    message_id: int,
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    # Find the original message
    original_message = db.get(models.Message, message_id)

    if not original_message:
        raise HTTPException(
            status_code=404,
            detail="Message not found"
        )

    # Only user messages can be edited
    if original_message.role != "user":
        raise HTTPException(
            status_code=400,
            detail="Only user messages can be edited"
        )

    conversation_id = original_message.conversation_id

    # Find the conversation
    conversation = db.get(
        models.Conversation,
        conversation_id
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    new_prompt = request.prompt.strip()

    if not new_prompt:
        raise HTTPException(
            status_code=422,
            detail="Prompt cannot be empty"
        )

    try:
        # Generate AI response first
        new_answer = generate_ai_response(new_prompt)

        # Update the original user message
        original_message.content = new_prompt

        # Delete all messages after the edited message
        db.query(models.Message).filter(
            models.Message.conversation_id == conversation_id,
            models.Message.id > message_id
        ).delete(synchronize_session=False)

        # Create the new assistant response
        assistant_message = models.Message(
            role="assistant",
            content=new_answer,
            conversation_id=conversation_id
        )

        db.add(assistant_message)
        db.commit()
        db.refresh(original_message)
        db.refresh(assistant_message)

        return {
            "conversation_id": conversation_id,
            "user_message": {
                "id": original_message.id,
                "role": original_message.role,
                "content": original_message.content
            },
            "assistant_message": {
                "id": assistant_message.id,
                "role": assistant_message.role,
                "content": assistant_message.content
            }
        }

    except Exception:
        db.rollback()
        logger.exception("Edit and resend failed")

        raise HTTPException(
            status_code=502,
            detail="Unable to edit and resend message"
        )


# ==================================
# SEARCH CONVERSATIONS ENDPOINT
# ==================================

@app.get("/users/{user_id}/conversations/search")
def search_conversations(
    user_id: int,
    q: str,
    db: Session = Depends(get_db)
):
    # Check whether user exists
    user = db.get(models.User, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Clean search keyword
    keyword = q.strip()

    if not keyword:
        return []

    search_pattern = f"%{keyword}%"

    # Search conversation titles and message contents
    results = db.query(models.Conversation).outerjoin(
        models.Message,
        models.Conversation.id == models.Message.conversation_id
    ).filter(
        models.Conversation.user_id == user_id,
        or_(
            models.Conversation.title.ilike(search_pattern),
            models.Message.content.ilike(search_pattern)
        )
    ).distinct().order_by(
        models.Conversation.id.desc()
    ).all()

    return results


# ==================================
# PIN / UNPIN CONVERSATION ENDPOINT
# ==================================

@app.patch("/conversations/{conversation_id}/pin")
def toggle_conversation_pin(
    conversation_id: int,
    db: Session = Depends(get_db)
):
    conversation = db.get(
        models.Conversation,
        conversation_id
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    # Toggle pin status
    conversation.is_pinned = not conversation.is_pinned

    db.commit()
    db.refresh(conversation)

    return {
        "message": "Conversation pin status updated",
        "conversation_id": conversation.id,
        "is_pinned": conversation.is_pinned
    }


# ==================================
# LIBRARY FOLDER ENDPOINTS
# ==================================

@app.post(
    "/users/{user_id}/library/folders",
    response_model=schemas.LibraryFolderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_library_folder(
    user_id: int,
    folder: schemas.LibraryFolderCreate,
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    folder_name = folder.name.strip()

    if not folder_name:
        raise HTTPException(status_code=422, detail="Folder name cannot be empty")

    new_folder = models.LibraryFolder(
        name=folder_name,
        user_id=user_id,
    )

    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)

    return new_folder


@app.get(
    "/users/{user_id}/library/folders",
    response_model=list[schemas.LibraryFolderResponse],
)
def get_library_folders(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return db.query(models.LibraryFolder).filter(
        models.LibraryFolder.user_id == user_id
    ).order_by(models.LibraryFolder.name.asc()).all()


@app.patch(
    "/users/{user_id}/library/folders/{folder_id}",
    response_model=schemas.LibraryFolderResponse,
)
def update_library_folder(
    user_id: int,
    folder_id: int,
    folder: schemas.LibraryFolderUpdate,
    db: Session = Depends(get_db),
):
    existing_folder = db.query(models.LibraryFolder).filter(
        models.LibraryFolder.id == folder_id,
        models.LibraryFolder.user_id == user_id,
    ).first()

    if not existing_folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder_name = folder.name.strip()

    if not folder_name:
        raise HTTPException(status_code=422, detail="Folder name cannot be empty")

    existing_folder.name = folder_name

    db.commit()
    db.refresh(existing_folder)

    return existing_folder


@app.delete(
    "/users/{user_id}/library/folders/{folder_id}",
)
def delete_library_folder(
    user_id: int,
    folder_id: int,
    db: Session = Depends(get_db),
):
    folder = db.query(models.LibraryFolder).filter(
        models.LibraryFolder.id == folder_id,
        models.LibraryFolder.user_id == user_id,
    ).first()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Move saved items out of the folder instead of deleting them.
    db.query(models.LibraryItem).filter(
        models.LibraryItem.folder_id == folder_id,
        models.LibraryItem.user_id == user_id,
    ).update(
        {models.LibraryItem.folder_id: None},
        synchronize_session=False,
    )

    db.delete(folder)
    db.commit()

    return {"message": "Folder deleted successfully"}


# ==================================
# LIBRARY ITEM ENDPOINTS
# ==================================

@app.post(
    "/users/{user_id}/library/items",
    response_model=schemas.LibraryItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_library_item(
    user_id: int,
    item: schemas.LibraryItemCreate,
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate the selected folder.
    if item.folder_id is not None:
        folder = db.query(models.LibraryFolder).filter(
            models.LibraryFolder.id == item.folder_id,
            models.LibraryFolder.user_id == user_id,
        ).first()

        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

    content_snapshot = item.content_snapshot
    message_id = item.message_id
    conversation_id = item.conversation_id

    # ----------------------------------
    # SAVE AN AI RESPONSE
    # ----------------------------------

    if item.item_type == "response":
        if not message_id:
            raise HTTPException(
                status_code=422,
                detail="Message ID is required to save an AI response",
            )

        message = db.get(models.Message, message_id)

        if not message or message.role != "assistant":
            raise HTTPException(
                status_code=404,
                detail="AI response not found",
            )

        conversation = db.get(models.Conversation, message.conversation_id)

        if not conversation or conversation.user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="You cannot save this AI response",
            )

        conversation_id = message.conversation_id
        content_snapshot = message.content

        # Avoid saving the same AI response twice.
        existing_item = db.query(models.LibraryItem).filter(
            models.LibraryItem.user_id == user_id,
            models.LibraryItem.item_type == "response",
            models.LibraryItem.message_id == message_id,
        ).first()

        if existing_item:
            raise HTTPException(
                status_code=409,
                detail="This AI response is already saved in your Library",
            )

    # ----------------------------------
    # SAVE AN ENTIRE CONVERSATION
    # ----------------------------------

    elif item.item_type == "conversation":
        if not conversation_id:
            raise HTTPException(
                status_code=422,
                detail="Conversation ID is required",
            )

        conversation = db.query(models.Conversation).filter(
            models.Conversation.id == conversation_id,
            models.Conversation.user_id == user_id,
        ).first()

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found",
            )

        messages = db.query(models.Message).filter(
            models.Message.conversation_id == conversation_id,
        ).order_by(models.Message.id.asc()).all()

        # Store a copy of the conversation's content.
        content_snapshot = "\n\n".join(
            f"{message.role.capitalize()}:\n{message.content}"
            for message in messages
        )

        # Avoid saving the same conversation twice.
        existing_item = db.query(models.LibraryItem).filter(
            models.LibraryItem.user_id == user_id,
            models.LibraryItem.item_type == "conversation",
            models.LibraryItem.conversation_id == conversation_id,
        ).first()

        if existing_item:
            raise HTTPException(
                status_code=409,
                detail="This conversation is already saved in your Library",
            )

    # ----------------------------------
    # CREATE A PERSONAL NOTE
    # ----------------------------------

    elif item.item_type == "note":
        if not content_snapshot or not content_snapshot.strip():
            raise HTTPException(
                status_code=422,
                detail="Note content cannot be empty",
            )

        content_snapshot = content_snapshot.strip()

    new_item = models.LibraryItem(
        item_type=item.item_type,
        title=item.title.strip(),
        content_snapshot=content_snapshot,
        user_id=user_id,
        folder_id=item.folder_id,
        message_id=message_id,
        conversation_id=conversation_id,
    )

    if not new_item.title:
        raise HTTPException(
            status_code=422,
            detail="Library item title cannot be empty",
        )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return new_item


@app.get(
    "/users/{user_id}/library/items",
    response_model=list[schemas.LibraryItemResponse],
)
def get_library_items(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return db.query(models.LibraryItem).filter(
        models.LibraryItem.user_id == user_id
    ).order_by(models.LibraryItem.created_at.desc()).all()


@app.patch(
    "/users/{user_id}/library/items/{item_id}",
    response_model=schemas.LibraryItemResponse,
)
def update_library_item(
    user_id: int,
    item_id: int,
    item_update: schemas.LibraryItemUpdate,
    db: Session = Depends(get_db),
):
    item = db.query(models.LibraryItem).filter(
        models.LibraryItem.id == item_id,
        models.LibraryItem.user_id == user_id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Library item not found")

    if item_update.title is not None:
        new_title = item_update.title.strip()

        if not new_title:
            raise HTTPException(
                status_code=422,
                detail="Library item title cannot be empty",
            )

        item.title = new_title

    if item_update.folder_id is not None:
        folder = db.query(models.LibraryFolder).filter(
            models.LibraryFolder.id == item_update.folder_id,
            models.LibraryFolder.user_id == user_id,
        ).first()

        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

        item.folder_id = item_update.folder_id

    if item_update.content_snapshot is not None:
        if item.item_type != "note":
            raise HTTPException(
                status_code=400,
                detail="Only personal notes can have their content edited here",
            )

        item.content_snapshot = item_update.content_snapshot

    db.commit()
    db.refresh(item)

    return item


@app.delete(
    "/users/{user_id}/library/items/{item_id}",
)
def delete_library_item(
    user_id: int,
    item_id: int,
    db: Session = Depends(get_db),
):
    item = db.query(models.LibraryItem).filter(
        models.LibraryItem.id == item_id,
        models.LibraryItem.user_id == user_id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Library item not found")

    db.delete(item)
    db.commit()

    return {"message": "Library item deleted successfully"}
