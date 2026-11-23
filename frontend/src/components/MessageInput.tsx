
import { useState } from 'react'

type MessageInputProps = {
  onSend: (message: string) => void
  disabled?: boolean
}

function MessageInput({
  onSend,
  disabled = false,
}: MessageInputProps) {
  const [input, setInput] = useState('')

  function handleSend() {
    if (input.trim() === '' || disabled) return

    onSend(input.trim())
    setInput('')
  }

  return (
    <div className="message-input">
      <input
        type="text"
        placeholder="Ask me anything..."
        value={input}
        disabled={disabled}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') handleSend()
        }}
      />

      <button
        onClick={handleSend}
        disabled={disabled || input.trim() === ''}
      >
        {disabled ? 'Thinking...' : 'Send'}
      </button>
    </div>
  )
}

export default MessageInput
