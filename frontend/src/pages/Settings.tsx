
import { useState } from 'react'

type Theme = 'light' | 'dark'

type SettingsProps = {
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

function Settings({ theme, onThemeChange }: SettingsProps) {
  const [enterToSend, setEnterToSend] = useState(true)
  const [showTimestamps, setShowTimestamps] = useState(true)

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Personalise your AL-IA experience.</p>
      </div>

      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>Appearance</h2>
          <p>Customise how AL-IA looks on your device.</p>
        </div>

        <div className="settings-item">
          <div>
            <h3>Theme</h3>
            <p>Choose your preferred interface theme.</p>
          </div>

          <select
            value={theme}
            onChange={(event) =>
              onThemeChange(event.target.value as Theme)
            }
          >
            <option value="light">Light – Dreamy Blue</option>
            <option value="dark">Dark – Midnight Blue</option>
          </select>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>Chat Preferences</h2>
          <p>Manage your conversation experience.</p>
        </div>

        <div className="settings-item">
          <div>
            <h3>Enter to send</h3>
            <p>Press Enter to send a message.</p>
          </div>

          <input
            type="checkbox"
            checked={enterToSend}
            onChange={(event) => setEnterToSend(event.target.checked)}
          />
        </div>

        <div className="settings-item">
          <div>
            <h3>Show timestamps</h3>
            <p>Display timestamps for chat messages.</p>
          </div>

          <input
            type="checkbox"
            checked={showTimestamps}
            onChange={(event) => setShowTimestamps(event.target.checked)}
          />
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>About AL-IA</h2>
          <p>Information about your AI assistant.</p>
        </div>

        <div className="settings-item">
          <div>
            <h3>AL-IA</h3>
            <p>Your personal AI assistant.</p>
          </div>
          <span>Version 1.0</span>
        </div>
      </section>
    </div>
  )
}

export default Settings
