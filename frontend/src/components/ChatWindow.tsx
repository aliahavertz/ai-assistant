
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Copy,
  Check,
  RefreshCw,
  Pencil,
  Save,
  X,
  Sparkles,
  Lightbulb,
  Code2,
  Palette,
  FileText,
  Star,
} from 'lucide-react'
import { UserRound } from 'lucide-react'

type Message = {
  id: number
  role: 'user' | 'assistant'
  text: string
}

type ChatWindowProps = {
  messages: Message[]
  conversationTitle: string
  conversationId: number | null
  onRegenerate: () => void
  isRegenerating: boolean
  onEdit: (messageId: number, prompt: string) => void
  isEditingResend: boolean
  onSuggestionSelect: (prompt: string) => void
  suggestionsDisabled: boolean
  savedResponses: Record<number, number>
  onToggleSaveResponse: (messageId: number, messageText: string) => void
}

const suggestions = [
  {
    label: 'Help me learn something new',
    prompt: 'Teach me something interesting and useful today.',
    icon: Lightbulb,
  },
  {
    label: 'Explain a programming concept',
    prompt: 'Explain a programming concept in a simple way with examples.',
    icon: Code2,
  },
  {
    label: 'Give me creative ideas',
    prompt: 'Give me some creative ideas for a project.',
    icon: Palette,
  },
  {
    label: 'Help me improve my writing',
    prompt: 'Help me write or improve a piece of text.',
    icon: FileText,
  },
]

function ChatWindow({
  messages,
  conversationTitle,
  conversationId,
  onRegenerate,
  isRegenerating,
  onEdit,
  isEditingResend,
  onSuggestionSelect,
  suggestionsDisabled,
  savedResponses,
  onToggleSaveResponse,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editedText, setEditedText] = useState('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages, conversationId])

  async function handleCopy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)

      setTimeout(() => {
        setCopiedIndex((currentIndex) =>
          currentIndex === index ? null : currentIndex
        )
      }, 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  function handleStartEdit(message: Message) {
    setEditingMessageId(message.id)
    setEditedText(message.text)
  }

  function handleCancelEdit() {
    setEditingMessageId(null)
    setEditedText('')
  }

  function handleSaveEdit(messageId: number) {
    const trimmedText = editedText.trim()

    if (!trimmedText || isEditingResend) return

    onEdit(messageId, trimmedText)
    setEditingMessageId(null)
    setEditedText('')
  }

  const lastAssistantIndex = messages.reduce(
    (lastIndex, message, index) =>
      message.role === 'assistant' ? index : lastIndex,
    -1
  )

  return (
    <div className="chat-window">
      <header className="chat-header">
        <h3>{conversationTitle}</h3>
      </header>

      <div className="chat-content">
        {messages.length === 0 ? (
          <section className="welcome-screen">
            <div className="welcome-mascot">
              <img
                src="/alia-mascot.png"
                alt="AL-IA friendly robot mascot"
              />

              <span className="mascot-sparkle">
                <Sparkles size={20} />
              </span>
            </div>

            <div className="welcome-copy">
              <span className="welcome-eyebrow">
                YOUR PERSONAL AI COMPANION
              </span>

              <h1>
                Hello! I'm <span>AL-IA.</span>
              </h1>

              <p className="welcome-description">
                Your AI assistant for learning, ideas, problem-solving and more.
              </p>

              <h2>What shall we explore today?</h2>

              <p className="welcome-hint">
                Choose a suggestion below to get started.
              </p>
            </div>

            <div className="welcome-suggestions">
              {suggestions.map((suggestion) => {
                const Icon = suggestion.icon

                return (
                  <button
                    key={suggestion.label}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => onSuggestionSelect(suggestion.prompt)}
                    disabled={suggestionsDisabled}
                  >
                    <span className="suggestion-icon">
                      <Icon size={18} strokeWidth={1.8} />
                    </span>

                    <span>{suggestion.label}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={`message-row ${message.role}`}
            >
              {/* AL-IA avatar on the left */}
              {message.role === 'assistant' && (
                <div className="chat-avatar assistant-avatar">
                  <img src="/alia-symbol.png" alt="AL-IA" />
                </div>
              )}

              {/* Message bubble */}
              <div className={`message ${message.role}`}>
                {message.role === 'user' &&
                editingMessageId === message.id ? (
                  <div className="edit-message-container">
                    <textarea
                      className="edit-message-input"
                      value={editedText}
                      onChange={(event) =>
                        setEditedText(event.target.value)
                      }
                      rows={4}
                      disabled={isEditingResend}
                      autoFocus
                    />

                    <div className="message-actions">
                      <button
                        className="edit-save-button"
                        onClick={() => handleSaveEdit(message.id)}
                        disabled={!editedText.trim() || isEditingResend}
                        title="Save and resend"
                      >
                        {isEditingResend ? (
                          <>Resending...</>
                        ) : (
                          <>
                            <Save size={15} strokeWidth={1.8} />
                            <span>Save &amp; Resend</span>
                          </>
                        )}
                      </button>

                      <button
                        className="edit-cancel-button"
                        onClick={handleCancelEdit}
                        disabled={isEditingResend}
                        title="Cancel editing"
                      >
                        <X size={15} strokeWidth={1.8} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="message-text">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.text}
                      </ReactMarkdown>
                    </div>

                    <div className="message-actions">
                      {message.role === 'user' && (
                        <button
                          className="edit-button"
                          onClick={() => handleStartEdit(message)}
                          disabled={isEditingResend || isRegenerating}
                          title="Edit message"
                          aria-label="Edit message"
                        >
                          <Pencil size={15} strokeWidth={1.8} />
                        </button>
                      )}

                      {message.role === 'assistant' && (
                        <>
                          {/* Star / Unstar response */}
                          <button
                            className={`star-button ${
                              savedResponses[message.id] ? 'starred' : ''
                            }`}
                            onClick={() =>
                              onToggleSaveResponse(message.id, message.text)
                            }
                            title={
                              savedResponses[message.id]
                                ? 'Remove from Library'
                                : 'Save to Library'
                            }
                            aria-label={
                              savedResponses[message.id]
                                ? 'Remove saved response'
                                : 'Save response'
                            }
                          >
                            <Star
                              size={15}
                              strokeWidth={1.8}
                              fill={
                                savedResponses[message.id]
                                  ? 'currentColor'
                                  : 'none'
                              }
                            />
                          </button>

                          {/* Copy response */}
                          <button
                            className="copy-button"
                            onClick={() => handleCopy(message.text, index)}
                            title={
                              copiedIndex === index
                                ? 'Copied!'
                                : 'Copy response'
                            }
                            aria-label="Copy response"
                          >
                            {copiedIndex === index ? (
                              <Check size={15} strokeWidth={2} />
                            ) : (
                              <Copy size={15} strokeWidth={1.8} />
                            )}
                          </button>

                          {/* Regenerate latest response */}
                          {index === lastAssistantIndex && (
                            <button
                              className="regenerate-button"
                              onClick={onRegenerate}
                              disabled={isRegenerating || isEditingResend}
                              title="Regenerate response"
                              aria-label="Regenerate response"
                            >
                              <RefreshCw
                                size={15}
                                strokeWidth={1.8}
                                className={
                                  isRegenerating ? 'icon-spinning' : ''
                                }
                              />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* User avatar on the right */}
              {message.role === 'user' && (
                <div className="chat-avatar user-avatar">
                  <UserRound size={17} strokeWidth={1.8} />
                </div>
              )}
            </div>
          ))
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

export default ChatWindow
