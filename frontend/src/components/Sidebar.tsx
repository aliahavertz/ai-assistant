import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pin,
  Pencil,
  Trash2,
  UserRound,
  Settings as SettingsIcon,
  X,
  PanelLeftClose,
  Library,
} from 'lucide-react'

type Page = 'chat' | 'settings' | 'profile' | 'library'

type Conversation = {
  id: number
  title: string
  user_id: number
  is_pinned: boolean
}

type SidebarProps = {
  conversations: Conversation[]
  activeConversationId: number | null
  onNewChat: () => void
  onNavigate: (page: Page) => void
  activePage: Page
  onSelectConversation: (conversationId: number) => void
  onDeleteConversation: (conversationId: number) => void
  onRenameConversation: (conversationId: number, newTitle: string) => void
  onTogglePin: (conversationId: number) => void
}

const USER_ID = 3

function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onNavigate,
  activePage,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onTogglePin,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Conversation[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editedTitle, setEditedTitle] = useState('')

  const [openConversationMenu, setOpenConversationMenu] =
    useState<number | null>(null)

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)

  // Search conversations
  useEffect(() => {
    const keyword = searchQuery.trim()

    if (!keyword) {
      setSearchResults([])
      setSearchError('')
      setIsSearching(false)
      return
    }

    let isActive = true

    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      setSearchError('')

      try {
        const response = await fetch(
          `/api/users/${USER_ID}/conversations/search?q=${encodeURIComponent(keyword)}`
        )

        if (!response.ok) {
          throw new Error('Failed to search conversations')
        }

        const data: Conversation[] = await response.json()

        if (isActive) {
          setSearchResults(data)
        }
      } catch (error) {
        console.error('Search error:', error)

        if (isActive) {
          setSearchError('Unable to search conversations. Please try again.')
          setSearchResults([])
        }
      } finally {
        if (isActive) {
          setIsSearching(false)
        }
      }
    }, 400)

    return () => {
      isActive = false
      clearTimeout(timeoutId)
    }
  }, [searchQuery])

  // Pinned conversations first
  const displayedConversations = (
    searchQuery.trim() ? searchResults : conversations
  )
    .slice()
    .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))

  // Expand sidebar or navigate to Chat
  function handleBrandClick() {
    if (isCollapsed) {
      setIsCollapsed(false)
    } else {
      onNavigate('chat')
    }
  }

  // Rename conversation
  function handleStartRename(conversation: Conversation) {
    setEditingId(conversation.id)
    setEditedTitle(conversation.title)
    setOpenConversationMenu(null)
  }

  function handleSaveRename(conversationId: number) {
    const newTitle = editedTitle.trim()

    if (!newTitle) return

    onRenameConversation(conversationId, newTitle)
    setEditingId(null)
    setEditedTitle('')
  }

  function handleRenameKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    conversationId: number
  ) {
    if (event.key === 'Enter') {
      handleSaveRename(conversationId)
    }

    if (event.key === 'Escape') {
      setEditingId(null)
      setEditedTitle('')
    }
  }

  // Delete conversation
  function handleDelete(conversationId: number) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this conversation?'
    )

    if (confirmed) {
      onDeleteConversation(conversationId)
    }

    setOpenConversationMenu(null)
  }

  // Pin conversation
  function handlePin(conversationId: number) {
    onTogglePin(conversationId)
    setOpenConversationMenu(null)
  }

  return (
    <aside
      className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}
    >
      {/* SCROLLABLE AREA */}
      <div className="sidebar-scroll-area">

        {/* BRAND */}
        <div className="sidebar-brand">
          <div
            className="sidebar-brand-content"
            onClick={handleBrandClick}
            role="button"
            tabIndex={0}
            title={isCollapsed ? 'Expand sidebar' : 'Go to Chat'}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleBrandClick()
              }
            }}
          >
            <img
              src="/alia-symbol.png"
              alt="AL-IA"
              className="sidebar-brand-image"
            />

            <div className="sidebar-brand-text">
              <h2>AL-IA</h2>
              <span>AI ASSISTANT</span>
            </div>
          </div>

          {!isCollapsed && (
            <button
              type="button"
              className="sidebar-collapse-button"
              onClick={() => setIsCollapsed(true)}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={22} strokeWidth={1.7} />
            </button>
          )}
        </div>

        {/* NEW CHAT */}
        <button
          type="button"
          className="new-chat"
          onClick={onNewChat}
          title="New Chat"
          aria-label="New Chat"
        >
          <Plus size={20} strokeWidth={1.8} />
          <span>New Chat</span>
        </button>

        {/* SEARCH */}
        <div className="sidebar-search">
          <Search size={17} className="search-icon" />

          <input
            type="text"
            className="search-input"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          {searchQuery && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearchQuery('')}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* LIBRARY */}
        <button
          type="button"
          className={`sidebar-library-button ${activePage === 'library' ? 'active' : ''}`}
          onClick={() => onNavigate('library')}
          title="Library"
          aria-label="Library"
        >
          <Library size={19} strokeWidth={1.8} />
          <span>Library</span>
        </button>

        {/* RECENT CHATS */}
        <div className="sidebar-menu">
          <p className="sidebar-section-title">
            {searchQuery.trim() ? 'Search Results' : 'Recent Chats'}
          </p>

          {isSearching && (
            <p className="search-status">Searching...</p>
          )}

          {searchError && (
            <p className="search-error">{searchError}</p>
          )}

          <ul>
            {!isSearching &&
            !searchError &&
            displayedConversations.length > 0 ? (
              displayedConversations.map((conversation) => (
                <li
                  key={conversation.id}
                  className={
                    activeConversationId === conversation.id
                      ? 'active-conversation'
                      : ''
                  }
                  onClick={() => {
                    if (editingId !== conversation.id) {
                      setOpenConversationMenu(null)
                      onSelectConversation(conversation.id)
                    }
                  }}
                >
                  <div className="conversation-item-content">
                    {editingId === conversation.id ? (
                      <div
                        className="rename-container"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          className="rename-input"
                          value={editedTitle}
                          onChange={(event) =>
                            setEditedTitle(event.target.value)
                          }
                          onKeyDown={(event) =>
                            handleRenameKeyDown(event, conversation.id)
                          }
                          autoFocus
                          maxLength={200}
                        />

                        <button
                          type="button"
                          className="rename-save"
                          onClick={() =>
                            handleSaveRename(conversation.id)
                          }
                          title="Save title"
                        >
                          ✓
                        </button>

                        <button
                          type="button"
                          className="rename-cancel"
                          onClick={() => {
                            setEditingId(null)
                            setEditedTitle('')
                          }}
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="conversation-row">
                        <div className="conversation-title-area">
                          {conversation.is_pinned && (
                            <Pin
                              size={13}
                              className="conversation-pin-icon"
                            />
                          )}

                          <span className="conversation-title">
                            {conversation.title}
                          </span>
                        </div>

                        <div className="conversation-menu-wrapper">
                          <button
                            type="button"
                            className="conversation-more-button"
                            title="Conversation options"
                            aria-label={`Options for ${conversation.title}`}
                            aria-expanded={
                              openConversationMenu === conversation.id
                            }
                            onClick={(event) => {
                              event.stopPropagation()

                              setOpenConversationMenu(
                                openConversationMenu === conversation.id
                                  ? null
                                  : conversation.id
                              )

                              setIsAccountMenuOpen(false)
                            }}
                          >
                            <MoreHorizontal size={19} />
                          </button>

                          {openConversationMenu === conversation.id && (
                            <div
                              className="conversation-dropdown"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handlePin(conversation.id)}
                              >
                                <Pin size={15} />
                                {conversation.is_pinned
                                  ? 'Unpin conversation'
                                  : 'Pin conversation'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleStartRename(conversation)
                                }
                              >
                                <Pencil size={15} />
                                Rename
                              </button>

                              <button
                                type="button"
                                className="dropdown-danger"
                                onClick={() =>
                                  handleDelete(conversation.id)
                                }
                              >
                                <Trash2 size={15} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))
            ) : (
              !isSearching &&
              !searchError && (
                <li className="no-search-results">
                  {searchQuery.trim()
                    ? 'No conversations found.'
                    : 'No conversations yet.'}
                </li>
              )
            )}
          </ul>
        </div>
      </div>

      {/* FIXED MY SPACE */}
      <div className="sidebar-account">
        <div className="account-menu-wrapper">
          {isAccountMenuOpen && (
            <div className="account-dropdown">
              <button
                type="button"
                className={activePage === 'profile' ? 'active' : ''}
                onClick={() => {
                  onNavigate('profile')
                  setIsAccountMenuOpen(false)
                }}
              >
                <UserRound size={16} />
                My Profile
              </button>

              <button
                type="button"
                className={activePage === 'settings' ? 'active' : ''}
                onClick={() => {
                  onNavigate('settings')
                  setIsAccountMenuOpen(false)
                }}
              >
                <SettingsIcon size={16} />
                Settings
              </button>
            </div>
          )}

          <button
            type="button"
            className="sidebar-account-button"
            onClick={() => {
              setIsAccountMenuOpen(!isAccountMenuOpen)
              setOpenConversationMenu(null)
            }}
            aria-expanded={isAccountMenuOpen}
          >
            <div className="account-avatar">
              <UserRound size={19} />
            </div>

            <div className="account-info">
              <strong>My Space</strong>
              <span>Personal workspace</span>
            </div>

            <MoreHorizontal
              size={20}
              className="account-more-icon"
            />
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar