
import { useEffect, useState } from 'react'
import { UserRound, Mail, Hash, ShieldCheck } from 'lucide-react'

type User = {
  id: number
  username: string
  email: string
}

type ProfileProps = {
  userId: number
}

function Profile({ userId }: ProfileProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      try {
        setIsLoading(true)
        setError('')

        const response = await fetch(`/api/users/${userId}`)

        if (!response.ok) {
          throw new Error('Unable to load profile information.')
        }

        const data: User = await response.json()
        setUser(data)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong.'
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [userId])

  if (isLoading) {
    return (
      <div className="profile-page">
        <p>Loading your profile...</p>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="profile-page">
        <h1>My Profile</h1>
        <p className="error-message">
          {error || 'Profile not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>View your personal account information.</p>
      </div>

      <section className="profile-card">
        <div className="profile-avatar">
          <UserRound size={42} strokeWidth={1.5} />
        </div>

        <h2>{user.username}</h2>
        <p className="profile-email">{user.email}</p>

        <span className="profile-status">
          <ShieldCheck size={15} />
          Registered Account
        </span>
      </section>

      <section className="profile-section">
        <div className="profile-section-heading">
          <h2>Personal Information</h2>
          <p>Your account details.</p>
        </div>

        <div className="profile-info-item">
          <div className="profile-info-icon">
            <UserRound size={19} />
          </div>
          <div>
            <span>Username</span>
            <strong>{user.username}</strong>
          </div>
        </div>

        <div className="profile-info-item">
          <div className="profile-info-icon">
            <Mail size={19} />
          </div>
          <div>
            <span>Email Address</span>
            <strong>{user.email}</strong>
          </div>
        </div>

        <div className="profile-info-item">
          <div className="profile-info-icon">
            <Hash size={19} />
          </div>
          <div>
            <span>User ID</span>
            <strong>#{user.id}</strong>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Profile
