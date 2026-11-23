
import { useEffect, useMemo, useState } from "react";
import {
  Folder,
  FolderPlus,
  FileText,
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
  X,
  Loader2,
  Star,
  ArrowLeft,
  BookmarkPlus,
  Trash2,
  Pencil,
  Save,
} from "lucide-react";

const API_URL = "http://localhost:8001";
const USER_ID = 3;

type LibraryFolder = {
  id: number;
  name: string;
  user_id: number;
};

type LibraryItem = {
  id: number;
  item_type: string;
  title: string;
  content_snapshot: string;
  user_id: number;
  folder_id: number | null;
  message_id: number | null;
  conversation_id: number | null;
};

function Library() {
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);

  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [selectedNote, setSelectedNote] = useState<LibraryItem | null>(null);
  const [showFolders, setShowFolders] = useState(true);
  const [isEditingNote, setIsEditingNote] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [folderName, setFolderName] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteFolderId, setNoteFolderId] = useState<number | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFolderId, setEditFolderId] = useState<number | null>(null);

  const [showFolderForm, setShowFolderForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load folders and Library items
  const loadLibrary = async () => {
    setLoading(true);
    setError("");

    try {
      const [folderResponse, itemResponse] = await Promise.all([
        fetch(`${API_URL}/users/${USER_ID}/library/folders`),
        fetch(`${API_URL}/users/${USER_ID}/library/items`),
      ]);

      if (!folderResponse.ok || !itemResponse.ok) {
        throw new Error("Unable to load your Library.");
      }

      const folderData: LibraryFolder[] = await folderResponse.json();
      const itemData: LibraryItem[] = await itemResponse.json();

      setFolders(folderData);
      setItems(itemData);

      // Keep the currently opened note in sync with updated data
      if (selectedNote) {
        const updatedNote = itemData.find(
          (item) => item.id === selectedNote.id
        );

        if (updatedNote) {
          setSelectedNote(updatedNote);
        } else {
          setSelectedNote(null);
          setIsEditingNote(false);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong loading your Library."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  // Separate Star Chats and Notes
  const starChats = useMemo(
    () => items.filter((item) => item.item_type === "response"),
    [items]
  );

  const notes = useMemo(
    () => items.filter((item) => item.item_type === "note"),
    [items]
  );

  // Search folders
  const visibleFolders = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(query)
    );
  }, [folders, searchQuery]);

  // Search Star Chats
  const visibleStarChats = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return starChats.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content_snapshot.toLowerCase().includes(query)
    );
  }, [starChats, searchQuery]);

  // Search notes
  const visibleNotes = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return notes.filter((item) => {
      const matchesFolder =
        selectedFolder === null || item.folder_id === selectedFolder;

      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.content_snapshot.toLowerCase().includes(query);

      return matchesFolder && matchesSearch;
    });
  }, [notes, selectedFolder, searchQuery]);

  const selectedFolderName = folders.find(
    (folder) => folder.id === selectedFolder
  )?.name;

  // Open a note details page
  const openNote = (item: LibraryItem) => {
    setSelectedNote(item);
    setIsEditingNote(false);
    setEditTitle(item.title);
    setEditContent(item.content_snapshot);
    setEditFolderId(item.folder_id);
    setError("");
  };

  // Return to Library
  const closeNote = () => {
    setSelectedNote(null);
    setIsEditingNote(false);
    setError("");
  };

  // Start editing a note
  const startEditingNote = () => {
    if (!selectedNote) return;

    setEditTitle(selectedNote.title);
    setEditContent(selectedNote.content_snapshot);
    setEditFolderId(selectedNote.folder_id);
    setIsEditingNote(true);
    setError("");
  };

  // Save edited note
  const saveEditedNote = async () => {
    if (!selectedNote) return;

    if (!editTitle.trim() || !editContent.trim()) {
      setError("Note title and content cannot be empty.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/users/${USER_ID}/library/items/${selectedNote.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editTitle.trim(),
            content_snapshot: editContent.trim(),
            folder_id: editFolderId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || "Failed to update note."
        );
      }

      const updatedItem: LibraryItem = await response.json();

      setItems((previous) =>
        previous.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );

      setSelectedNote(updatedItem);
      setIsEditingNote(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update note."
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete note
  const deleteNote = async () => {
    if (!selectedNote) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${selectedNote.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/users/${USER_ID}/library/items/${selectedNote.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete note.");
      }

      setItems((previous) =>
        previous.filter((item) => item.id !== selectedNote.id)
      );

      setSelectedNote(null);
      setIsEditingNote(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete note."
      );
    } finally {
      setSaving(false);
    }
  };

  // Create folder
  const createFolder = async () => {
    const trimmedName = folderName.trim();

    if (!trimmedName) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/users/${USER_ID}/library/folders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: trimmedName }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create folder.");
      }

      setFolderName("");
      setShowFolderForm(false);

      await loadLibrary();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create folder."
      );
    } finally {
      setSaving(false);
    }
  };

  // Create note
  const createNote = async () => {
    const trimmedTitle = noteTitle.trim();
    const trimmedContent = noteContent.trim();

    if (!trimmedTitle || !trimmedContent) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/users/${USER_ID}/library/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            item_type: "note",
            title: trimmedTitle,
            content_snapshot: trimmedContent,
            folder_id: noteFolderId,
            message_id: null,
            conversation_id: null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save note.");
      }

      setNoteTitle("");
      setNoteContent("");
      setNoteFolderId(null);
      setShowNoteForm(false);

      await loadLibrary();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save note."
      );
    } finally {
      setSaving(false);
    }
  };

  // Prepare a note from a starred AI response
  const createNoteFromStar = (item: LibraryItem) => {
    setNoteTitle(item.title || "Saved AI Response");
    setNoteContent(item.content_snapshot);
    setNoteFolderId(selectedFolder);
    setShowNoteForm(true);
    setShowFolderForm(false);
  };

  // Remove a response from Star Chats
  const removeStarChat = async (itemId: number) => {
    const confirmed = window.confirm(
      "Remove this response from Star Chats?"
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await fetch(
        `${API_URL}/users/${USER_ID}/library/items/${itemId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Unable to remove this starred response.");
      }

      await loadLibrary();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove this starred response."
      );
    }
  };

  // Open note creation form
  const openNoteForm = () => {
    setNoteTitle("");
    setNoteContent("");
    setNoteFolderId(selectedFolder);
    setShowNoteForm(true);
    setShowFolderForm(false);
  };

  // NOTE DETAILS PAGE
  if (selectedNote) {
    return (
      <div className="library-page note-details-page">
        <button
          className="library-back-button"
          onClick={closeNote}
        >
          <ArrowLeft size={17} />
          Back to Library
        </button>

        {error && <div className="library-error">{error}</div>}

        <div className="note-details-header">
          <div className="note-details-heading">
            <div className="library-heading-icon">
              <FileText size={24} />
            </div>

            <div>
              <span className="note-details-label">MY NOTES</span>
              <h1>{selectedNote.title}</h1>

              <p>
                {folders.find(
                  (folder) => folder.id === selectedNote.folder_id
                )?.name ?? "No folder"}
              </p>
            </div>
          </div>

          {!isEditingNote && (
            <div className="note-details-actions">
              <button
                className="library-button secondary"
                onClick={startEditingNote}
              >
                <Pencil size={16} />
                Edit note
              </button>

              <button
                className="library-button secondary note-delete-button"
                onClick={deleteNote}
                disabled={saving}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          )}
        </div>

        {isEditingNote ? (
          <div className="note-editor">
            <h2>Edit your note</h2>

            <label>Note title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Note title..."
            />

            <label>Note content</label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={14}
              placeholder="Write your note..."
            />

            <label>Move to folder</label>
            <select
              value={editFolderId ?? ""}
              onChange={(e) =>
                setEditFolderId(
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
            >
              <option value="">No folder</option>

              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>

            <div className="note-editor-actions">
              <button
                className="library-button secondary"
                onClick={() => {
                  setIsEditingNote(false);
                  setError("");
                }}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="library-button primary"
                onClick={saveEditedNote}
                disabled={
                  saving || !editTitle.trim() || !editContent.trim()
                }
              >
                {saving ? <Loader2 size={16} /> : <Save size={16} />}
                Save changes
              </button>
            </div>
          </div>
        ) : (
          <article className="note-details-content">
            <div className="note-details-content-top">
              <span>
                <FileText size={16} />
                Note content
              </span>

              <span>
                {selectedNote.content_snapshot.length} characters
              </span>
            </div>

            <div className="note-details-text">
              {selectedNote.content_snapshot}
            </div>
          </article>
        )}
      </div>
    );
  }

  return (
    <div className="library-page">

      {/* Header */}
      <div className="library-header">
        <div className="library-heading">
          <div className="library-heading-icon">
            <BookOpen size={24} />
          </div>

          <div>
            <h1>My Library</h1>
            <p>Your personal space for notes and saved AI responses.</p>
          </div>
        </div>

        <div className="library-header-actions">
          <button
            className="library-button secondary"
            onClick={() => {
              setShowFolderForm(true);
              setShowNoteForm(false);
            }}
          >
            <FolderPlus size={17} />
            New folder
          </button>

          <button
            className="library-button primary"
            onClick={openNoteForm}
          >
            <Plus size={17} />
            New note
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="library-search">
        <Search size={18} />

        <input
          type="text"
          placeholder="Search your notes, folders and Star Chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {error && <div className="library-error">{error}</div>}

      {/* Create Folder Form */}
      {showFolderForm && (
        <div className="library-form-panel">
          <div className="library-form-header">
            <h3>Create a folder</h3>

            <button
              className="library-close-button"
              onClick={() => setShowFolderForm(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <label>Folder name</label>

          <input
            type="text"
            placeholder="e.g. Programming, Assignments, Research..."
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createFolder();
            }}
          />

          <button
            className="library-button primary"
            onClick={createFolder}
            disabled={saving || !folderName.trim()}
          >
            {saving ? <Loader2 size={16} /> : <FolderPlus size={16} />}
            Create folder
          </button>
        </div>
      )}

      {/* Create Note Form */}
      {showNoteForm && (
        <div className="library-form-panel">
          <div className="library-form-header">
            <h3>Create a note</h3>

            <button
              className="library-close-button"
              onClick={() => setShowNoteForm(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <label>Note title</label>

          <input
            type="text"
            placeholder="Give your note a title..."
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
          />

          <label>Note content</label>

          <textarea
            placeholder="Write your notes here..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            rows={6}
          />

          <div className="library-form-folder">
            <label>Save to folder</label>

            <select
              value={noteFolderId ?? ""}
              onChange={(e) =>
                setNoteFolderId(
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
            >
              <option value="">No folder</option>

              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="library-button primary"
            onClick={createNote}
            disabled={
              saving || !noteTitle.trim() || !noteContent.trim()
            }
          >
            {saving ? <Loader2 size={16} /> : <FileText size={16} />}
            Save note
          </button>
        </div>
      )}

      {loading ? (
        <div className="library-loading">
          <Loader2 size={24} />
          <p>Loading your Library...</p>
        </div>
      ) : (
        <>
          {/* MAIN LIBRARY LANDING PAGE */}
          {selectedFolder === null ? (
            <>
              {/* Recent Folders */}
              <section className="library-section">
                <div className="library-section-heading">
                  <div>
                    <h2>Recent Folders</h2>
                    <p>Organise your learning materials.</p>
                  </div>

                  <div className="library-folder-heading-actions">
                    <span>{visibleFolders.length} folders</span>

                    <button
                      className="library-folder-toggle"
                      onClick={() =>
                        setShowFolders((previous) => !previous)
                      }
                      aria-label={
                        showFolders ? "Hide folders" : "Show folders"
                      }
                      title={
                        showFolders ? "Hide folders" : "Show folders"
                      }
                    >
                      {showFolders ? (
                        <ChevronUp size={19} />
                      ) : (
                        <ChevronDown size={19} />
                      )}
                    </button>
                  </div>
                </div>

                {showFolders && (
                  <>
                    {visibleFolders.length > 0 ? (
                      <div className="library-folder-grid">
                        {visibleFolders.map((folder, index) => {
                          const folderCount = notes.filter(
                            (item) => item.folder_id === folder.id
                          ).length;

                          return (
                            <button
                              key={folder.id}
                              className={`library-folder-card folder-color-${index % 3}`}
                              onClick={() => {
                                setSelectedFolder(folder.id);
                                setSearchQuery("");
                              }}
                            >
                              <div className="library-folder-card-icon">
                                <Folder size={23} />
                              </div>

                              <div>
                                <h3>{folder.name}</h3>
                                <p>
                                  {folderCount}{" "}
                                  {folderCount === 1 ? "item" : "items"}
                                </p>
                              </div>

                              <ChevronRight
                                size={18}
                                className="library-folder-arrow"
                              />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="library-muted-text">
                        {searchQuery
                          ? "No matching folders found."
                          : "No folders yet. Create your first folder to get started."}
                      </p>
                    )}
                  </>
                )}
              </section>

              {/* Star Chats */}
              <section className="library-section library-notes-section">
                <div className="library-section-heading">
                  <div>
                    <h2>
                      <Star size={19} fill="currentColor" />
                      {" "}Star Chats
                    </h2>

                    <p>
                      Your favourite AI responses, ready to turn into notes.
                    </p>
                  </div>

                  <span>{visibleStarChats.length} starred</span>
                </div>

                {visibleStarChats.length === 0 ? (
                  <div className="library-empty">
                    <div className="library-empty-icon">
                      <Star size={30} />
                    </div>

                    <h3>
                      {searchQuery
                        ? "No matching Star Chats"
                        : "No Star Chats yet"}
                    </h3>

                    <p>
                      Star useful AI responses during your conversations.
                      They will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="library-item-grid">
                    {visibleStarChats.map((item, index) => (
                      <article
                        className={`library-item-card note-color-${index % 3}`}
                        key={item.id}
                      >
                        <div className="library-item-card-top">
                          <div className="library-item-icon">
                            <Star size={20} fill="currentColor" />
                          </div>

                          <span className="library-item-type">
                            Starred response
                          </span>
                        </div>

                        <h3>{item.title || "Saved AI Response"}</h3>

                        <p className="library-item-preview">
                          {item.content_snapshot}
                        </p>

                        <div className="library-item-card-bottom">
                          <button
                            className="library-button primary"
                            onClick={() => createNoteFromStar(item)}
                          >
                            <BookmarkPlus size={15} />
                            Create note
                          </button>

                          <button
                            className="library-close-button"
                            onClick={() => removeStarChat(item.id)}
                            title="Remove from Star Chats"
                            aria-label="Remove starred response"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {/* My Notes */}
              <section className="library-section library-notes-section">
                <div className="library-section-heading">
                  <div>
                    <h2>My Notes</h2>
                    <p>
                      {visibleNotes.length}{" "}
                      {visibleNotes.length === 1 ? "item" : "items"} saved
                      in your Library.
                    </p>
                  </div>
                </div>

                {visibleNotes.length === 0 ? (
                  <div className="library-empty">
                    <div className="library-empty-icon">
                      <FileText size={30} />
                    </div>

                    <h3>
                      {searchQuery
                        ? "No matching notes"
                        : "No notes yet"}
                    </h3>

                    <p>
                      Create a note or turn one of your Star Chats into a
                      note to keep your learning materials organised.
                    </p>

                    {!searchQuery && (
                      <button
                        className="library-button primary"
                        onClick={openNoteForm}
                      >
                        <Plus size={17} />
                        Create your first note
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="library-item-grid">
                    {visibleNotes.map((item, index) => (
                      <article
                        className={`library-item-card note-color-${index % 3} library-note-clickable`}
                        key={item.id}
                        onClick={() => openNote(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openNote(item);
                          }
                        }}
                      >
                        <div className="library-item-card-top">
                          <div className="library-item-icon">
                            <FileText size={20} />
                          </div>

                          <span className="library-item-type">
                            Note
                          </span>
                        </div>

                        <h3>{item.title}</h3>

                        <p className="library-item-preview">
                          {item.content_snapshot}
                        </p>

                        <div className="library-item-card-bottom">
                          <span>
                            {folders.find(
                              (folder) => folder.id === item.folder_id
                            )?.name ?? "No folder"}
                          </span>

                          <span className="library-note-open-label">
                            Open note <ChevronRight size={15} />
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            /* SELECTED FOLDER PAGE */
            <section className="library-section library-notes-section">
              <button
                className="library-back-button"
                onClick={() => {
                  setSelectedFolder(null);
                  setSearchQuery("");
                }}
              >
                <ArrowLeft size={17} />
                Back to Library
              </button>

              <div className="library-section-heading">
                <div>
                  <h2>{selectedFolderName}</h2>

                  <p>
                    {visibleNotes.length}{" "}
                    {visibleNotes.length === 1 ? "note" : "notes"} saved
                    in this folder.
                  </p>
                </div>

                <button
                  className="library-button primary"
                  onClick={openNoteForm}
                >
                  <Plus size={17} />
                  New note
                </button>
              </div>

              {visibleNotes.length === 0 ? (
                <div className="library-empty">
                  <div className="library-empty-icon">
                    <FileText size={30} />
                  </div>

                  <h3>
                    {searchQuery
                      ? "No matching notes"
                      : "No notes here yet"}
                  </h3>

                  <p>
                    {searchQuery
                      ? "Try another search to find notes in this folder."
                      : "Create notes or save your favourite AI responses here to keep your learning materials organised."}
                  </p>

                  {!searchQuery && (
                    <button
                      className="library-button primary"
                      onClick={openNoteForm}
                    >
                      <Plus size={17} />
                      Create your first note
                    </button>
                  )}
                </div>
              ) : (
                <div className="library-item-grid">
                  {visibleNotes.map((item, index) => (
                    <article
                      className={`library-item-card note-color-${index % 3} library-note-clickable`}
                      key={item.id}
                      onClick={() => openNote(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openNote(item);
                        }
                      }}
                    >
                      <div className="library-item-card-top">
                        <div className="library-item-icon">
                          <FileText size={20} />
                        </div>

                        <span className="library-item-type">
                          Note
                        </span>
                      </div>

                      <h3>{item.title}</h3>

                      <p className="library-item-preview">
                        {item.content_snapshot}
                      </p>

                      <div className="library-item-card-bottom">
                        <span>{selectedFolderName}</span>

                        <span className="library-note-open-label">
                          Open note <ChevronRight size={15} />
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default Library;
