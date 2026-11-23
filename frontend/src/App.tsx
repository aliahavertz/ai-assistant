
import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import MessageInput from './components/MessageInput'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import Library from './pages/Library'
import './App.css'

// Temporary test user
const USER_ID = 3

type Message = {
  id: number
  role: 'user' | 'assistant'
  text: string
}

type APIMessage = {
  id: number
  role: 'user' | 'assistant'
  content: string
  conversation_id: number
}

type SavedLibraryItem = {
  id: number
  item_type: string
  message_id: number | null
  conversation_id: number | null
}

type Conversation = {
  id: number
  title: string
  user_id: number
  is_pinned: boolean
}

type ChatResponse = {
  conversation_id: number
  user_message: {
    id: number
    role: 'user'
    content: string
  }
  assistant_message: {
    id: number
    role: 'assistant'
    content: string
  }
}

type RegenerateResponse = {
  conversation_id: number
  assistant_message: {
    id: number
    role: 'assistant'
    content: string
    conversation_id: number
  }
}

function createConversationTitle(prompt: string): string {
  const cleanedPrompt = prompt.trim().replace(/\s+/g, ' ')
  const words = cleanedPrompt.split(' ')
  let title = words.slice(0, 6).join(' ')

  if (title.length > 50) {
    title = title.slice(0, 47).trimEnd() + '...'
  }

  return title.charAt(0).toUpperCase() + title.slice(1)
}

function App() {
  const [activePage, setActivePage] = useState<
    'chat' | 'settings' | 'profile' | 'library'
  >('chat')

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('alia-theme')
    return savedTheme === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    localStorage.setItem('alia-theme', theme)
  }, [theme])

  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])

  const [savedResponses, setSavedResponses] = useState<
    Record<number, number>
  >({})

  const [savedConversations, setSavedConversations] = useState<
    Record<number, number>
  >({})

  const [activeConversationId, setActiveConversationId] =
    useState<number | null>(null)

  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isEditingResend, setIsEditingResend] = useState(false)
  const [error, setError] = useState('')

  const conversationTitle =
    conversations.find(
      (conversation) => conversation.id === activeConversationId
    )?.title || 'New Conversation'

  // Automatically delete an empty conversation when leaving it
  async function cleanupEmptyConversation(): Promise<boolean> {
    if (activeConversationId === null || messages.length > 0) {
      return true
    }

    try {
      const response = await fetch(
        `/api/conversations/${activeConversationId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        throw new Error('Unable to remove empty conversation')
      }

      setConversations((previous) =>
        previous.filter(
          (conversation) => conversation.id !== activeConversationId
        )
      )

      setMessages([])
      setActiveConversationId(null)

      return true
    } catch (err) {
      console.error('Empty conversation cleanup failed:', err)
      setError('Unable to remove empty conversation.')
      return false
    }
  }

  // STEP 1: Load conversation messages
  async function loadMessages(conversationId: number) {
    setIsLoadingHistory(true)
    setError('')

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`
      )

      if (!response.ok) {
        throw new Error('Failed to load conversation messages')
      }

      const data: APIMessage[] = await response.json()

      const formattedMessages: Message[] = data.map((message) => ({
        id: message.id,
        role: message.role,
        text: message.content,
      }))

      setMessages(formattedMessages)
      setActiveConversationId(conversationId)
    } catch (err) {
      console.error('Error loading messages:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load conversation messages'
      )
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // STEP 2: Load conversations
  useEffect(() => {
    async function loadConversations() {
      try {
        const response = await fetch(
          `/api/users/${USER_ID}/conversations`
        )

        if (!response.ok) {
          throw new Error('Failed to load conversations')
        }

        const data: Conversation[] = await response.json()

        setConversations(data)

        if (data.length > 0) {
          await loadMessages(data[0].id)
        } else {
          setMessages([])
          setActiveConversationId(null)
        }
      } catch (err) {
        console.error('Error loading conversations:', err)

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load conversations'
        )
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadConversations()
  }, [])

  // Load previously saved AI responses and conversations
  useEffect(() => {
    async function loadSavedItems() {
      try {
        const response = await fetch(
          `/api/users/${USER_ID}/library/items`
        )

        if (!response.ok) {
          throw new Error('Failed to load saved Library items')
        }

        const items: SavedLibraryItem[] = await response.json()

        const savedResponseMap: Record<number, number> = {}
        const savedConversationMap: Record<number, number> = {}

        items.forEach((item) => {
          if (
            item.item_type === 'response' &&
            item.message_id !== null
          ) {
            savedResponseMap[item.message_id] = item.id
          }

          if (
            item.item_type === 'conversation' &&
            item.conversation_id !== null
          ) {
            savedConversationMap[item.conversation_id] = item.id
          }
        })

        setSavedResponses(savedResponseMap)
        setSavedConversations(savedConversationMap)
      } catch (err) {
        console.error('Error loading saved Library items:', err)
      }
    }

    loadSavedItems()
  }, [])

  // STEP 3: Create new conversation
  async function handleNewChat() {
    if (isLoading || isRegenerating || isEditingResend) return

    const canContinue = await cleanupEmptyConversation()

    if (!canContinue) return

    setError('')

    try {
      const response = await fetch(
        `/api/users/${USER_ID}/conversations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'New Conversation',
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to create a new conversation')
      }

      const newConversation: Conversation = await response.json()

      setConversations((previous) => [
        newConversation,
        ...previous,
      ])

      setMessages([])
      setActiveConversationId(newConversation.id)
    } catch (err) {
      console.error('Error creating conversation:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create a new conversation'
      )
    }
  }

  // STEP 4: Select conversation
  async function handleSelectConversation(conversationId: number) {
    if (
      conversationId === activeConversationId ||
      isLoading ||
      isRegenerating ||
      isEditingResend
    ) return

    const canContinue = await cleanupEmptyConversation()

    if (!canContinue) return

    setConversations((previous) => {
      const selected = previous.find(
        (conversation) => conversation.id === conversationId
      )

      if (!selected) return previous

      return [
        selected,
        ...previous.filter(
          (conversation) => conversation.id !== conversationId
        ),
      ]
    })

    setActivePage('chat')
    await loadMessages(conversationId)
  }

  // Navigate between Chat, Settings, Profile and Library
  async function handleNavigate(
    page: 'chat' | 'settings' | 'profile' | 'library'
  ) {
    if (page === activePage) return

    const canContinue = await cleanupEmptyConversation()

    if (!canContinue) return

    setActivePage(page)
  }

  // STEP 5: Delete conversation
  async function handleDeleteConversation(conversationId: number) {
    if (isLoading || isRegenerating || isEditingResend) return

    setError('')

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.detail || 'Failed to delete conversation'
        )
      }

      const remainingConversations = conversations.filter(
        (conversation) => conversation.id !== conversationId
      )

      setConversations(remainingConversations)

      if (activeConversationId === conversationId) {
        setMessages([])
        setActiveConversationId(null)

        if (remainingConversations.length > 0) {
          await loadMessages(remainingConversations[0].id)
        }
      }
    } catch (err) {
      console.error('Delete conversation error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete conversation'
      )
    }
  }

  // Rename conversation
  async function handleRenameConversation(
    conversationId: number,
    newTitle: string
  ) {
    const trimmedTitle = newTitle.trim()

    if (!trimmedTitle) {
      setError('Conversation title cannot be empty.')
      return
    }

    try {
      setError('')

      const response = await fetch(
        `/api/conversations/${conversationId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: trimmedTitle,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.detail || 'Failed to rename conversation'
        )
      }

      const updatedConversation: Conversation = await response.json()

      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? updatedConversation
            : conversation
        )
      )
    } catch (err) {
      console.error('Rename error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to rename conversation'
      )
    }
  }

  // Pin or unpin conversation
  async function handleTogglePin(conversationId: number) {
    try {
      setError('')

      const response = await fetch(
        `/api/conversations/${conversationId}/pin`,
        {
          method: 'PATCH',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.detail || 'Failed to update pin status'
        )
      }

      const data: {
        conversation_id: number
        is_pinned: boolean
      } = await response.json()

      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                is_pinned: data.is_pinned,
              }
            : conversation
        )
      )
    } catch (err) {
      console.error('Pin error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update pin status'
      )
    }
  }

  // Star or unstar an AI response
  async function handleToggleSaveResponse(
    messageId: number,
    messageText: string
  ) {
    const existingItemId = savedResponses[messageId]

    try {
      setError('')

      // UNSTAR: Remove the response from Library
      if (existingItemId) {
        const response = await fetch(
          `/api/users/${USER_ID}/library/items/${existingItemId}`,
          {
            method: 'DELETE',
          }
        )

        if (!response.ok) {
          throw new Error('Failed to remove saved response')
        }

        setSavedResponses((previous) => {
          const updated = { ...previous }
          delete updated[messageId]
          return updated
        })

        return
      }

      // STAR: Save the AI response into Library
      if (activeConversationId === null) return

      const response = await fetch(
        `/api/users/${USER_ID}/library/items`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            item_type: 'response',
            title: messageText.slice(0, 60),
            content_snapshot: messageText,
            folder_id: null,
            message_id: messageId,
            conversation_id: activeConversationId,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.detail || 'Failed to save response'
        )
      }

      const savedItem: SavedLibraryItem = await response.json()

      setSavedResponses((previous) => ({
        ...previous,
        [messageId]: savedItem.id,
      }))
    } catch (err) {
      console.error('Save response error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save response'
      )
    }
  }

  // Save or remove an entire conversation from Library
  async function handleToggleSaveConversation() {
    if (activeConversationId === null || messages.length === 0) {
      return
    }

    const conversationId = activeConversationId
    const existingItemId = savedConversations[conversationId]

    try {
      setError('')

      // REMOVE: Remove conversation from Library
      if (existingItemId) {
        const response = await fetch(
          `/api/users/${USER_ID}/library/items/${existingItemId}`,
          {
            method: 'DELETE',
          }
        )

        if (!response.ok) {
          throw new Error('Failed to remove saved conversation')
        }

        setSavedConversations((previous) => {
          const updated = { ...previous }
          delete updated[conversationId]
          return updated
        })

        return
      }

      // SAVE: Save the entire conversation into Library
      const response = await fetch(
        `/api/users/${USER_ID}/library/items`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            item_type: 'conversation',
            title: conversationTitle,
            folder_id: null,
            conversation_id: conversationId,
            message_id: null,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.detail || 'Failed to save conversation'
        )
      }

      const savedItem: SavedLibraryItem = await response.json()

      setSavedConversations((previous) => ({
        ...previous,
        [conversationId]: savedItem.id,
      }))
    } catch (err) {
      console.error('Save conversation error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save conversation'
      )
    }
  }

  // STEP 6: Send message to Gemini
  async function handleSend(message: string) {
    if (
      activeConversationId === null ||
      isLoading ||
      isRegenerating ||
      isEditingResend
    ) {
      return
    }

    const conversationId = activeConversationId

    const activeConversation = conversations.find(
      (conversation) => conversation.id === conversationId
    )

    const isFirstMessage =
      messages.length === 0 &&
      activeConversation?.title === 'New Conversation'

    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/chat/ask?conversation_id=${conversationId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: message,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.detail || 'Failed to get AI response'
        )
      }

      const data: ChatResponse = await response.json()

      setMessages((previous) => [
        ...previous,
        {
          id: data.user_message.id,
          role: 'user',
          text: data.user_message.content,
        },
        {
          id: data.assistant_message.id,
          role: 'assistant',
          text: data.assistant_message.content,
        },
      ])

      // Automatically update conversation title
      if (isFirstMessage) {
        const newTitle = createConversationTitle(message)

        try {
          const titleResponse = await fetch(
            `/api/conversations/${conversationId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: newTitle,
              }),
            }
          )

          if (!titleResponse.ok) {
            throw new Error('Failed to update conversation title')
          }

          const updatedConversation: Conversation =
            await titleResponse.json()

          setConversations((previous) =>
            previous.map((conversation) =>
              conversation.id === updatedConversation.id
                ? updatedConversation
                : conversation
            )
          )
        } catch (titleError) {
          console.error(
            'Conversation title update failed:',
            titleError
          )
        }
      }
    } catch (err) {
      console.error('Chat error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // STEP 7: Regenerate latest AI response
  async function handleRegenerate() {
    if (
      activeConversationId === null ||
      isLoading ||
      isRegenerating ||
      isEditingResend
    ) {
      return
    }

    const conversationId = activeConversationId

    setError('')
    setIsRegenerating(true)

    try {
      const response = await fetch(
        `/api/chat/regenerate?conversation_id=${conversationId}`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.detail || 'Failed to regenerate AI response'
        )
      }

      const data: RegenerateResponse = await response.json()

      setMessages((previousMessages) => {
        const lastAssistantIndex = previousMessages.reduce(
          (lastIndex, message, index) =>
            message.role === 'assistant' ? index : lastIndex,
          -1
        )

        if (lastAssistantIndex === -1) {
          return previousMessages
        }

        return previousMessages.map((message, index) =>
          index === lastAssistantIndex
            ? {
                ...message,
                id: data.assistant_message.id,
                text: data.assistant_message.content,
              }
            : message
        )
      })
    } catch (err) {
      console.error('Regenerate error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to regenerate AI response'
      )
    } finally {
      setIsRegenerating(false)
    }
  }

  // STEP 8: Edit and resend user message
  async function handleEditResend(
    messageId: number,
    prompt: string
  ) {
    if (
      activeConversationId === null ||
      isLoading ||
      isRegenerating ||
      isEditingResend
    ) {
      return
    }

    const conversationId = activeConversationId

    setError('')
    setIsEditingResend(true)

    try {
      const response = await fetch(
        `/api/chat/edit-resend/${messageId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.detail || 'Failed to edit and resend message'
        )
      }

      const data: ChatResponse = await response.json()

      if (data.conversation_id !== conversationId) {
        throw new Error('Conversation mismatch. Please try again.')
      }

      // Reload messages to reflect the database changes
      await loadMessages(conversationId)
    } catch (err) {
      console.error('Edit and resend error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to edit and resend message'
      )
    } finally {
      setIsEditingResend(false)
    }
  }

  // STEP 9: Display AL-IA interface
  return (
    <div className={`app-container ${theme}-theme`}>
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePin={handleTogglePin}
        onNavigate={handleNavigate}
        activePage={activePage}
      />

      <main className="main-content">
        {activePage === 'chat' && (
          <>
            {isLoadingHistory && (
              <p className="loading-message">
                Loading your conversation...
              </p>
            )}

            {/* Save Conversation button */}
            <div className="conversation-save-bar">
              <button
                className={`save-conversation-button ${
                  activeConversationId !== null &&
                  savedConversations[activeConversationId]
                    ? 'saved'
                    : ''
                }`}
                onClick={handleToggleSaveConversation}
                disabled={
                  activeConversationId === null ||
                  messages.length === 0 ||
                  isLoading ||
                  isRegenerating ||
                  isEditingResend
                }
              >
                {activeConversationId !== null &&
                savedConversations[activeConversationId]
                  ? '✓ Saved to Library'
                  : '＋ Save Conversation'}
              </button>
            </div>

            <ChatWindow
              messages={messages}
              conversationTitle={conversationTitle}
              conversationId={activeConversationId}
              onRegenerate={handleRegenerate}
              isRegenerating={isRegenerating}
              onEdit={handleEditResend}
              isEditingResend={isEditingResend}
              onSuggestionSelect={handleSend}
              savedResponses={savedResponses}
              onToggleSaveResponse={handleToggleSaveResponse}
              suggestionsDisabled={
                isLoading ||
                isLoadingHistory ||
                isRegenerating ||
                isEditingResend ||
                activeConversationId === null
              }
            />

            {isLoading && (
              <div className="loading-message">
                <span>AL-IA is thinking</span>
                <span className="typing-dots">
                  <i></i>
                  <i></i>
                  <i></i>
                </span>
              </div>
            )}

            {isRegenerating && (
              <p className="loading-message">
                AL-IA is generating a new response...
              </p>
            )}

            {isEditingResend && (
              <p className="loading-message">
                AL-IA is processing your edited message...
              </p>
            )}

            {error && (
              <p className="error-message">
                {error}
              </p>
            )}

            <MessageInput
              onSend={handleSend}
              disabled={
                isLoading ||
                isLoadingHistory ||
                isRegenerating ||
                isEditingResend ||
                activeConversationId === null
              }
            />
          </>
        )}

        {activePage === 'settings' && (
          <Settings
            theme={theme}
            onThemeChange={setTheme}
          />
        )}

        {activePage === 'profile' && (
          <Profile userId={USER_ID} />
        )}

        {activePage === 'library' && (
          <Library />
        )}
      </main>
    </div>
  )
}

export default App
