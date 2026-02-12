import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'
import './LoginScreen.css'

export default function LoginScreen() {
  const [loginMenuOpen, setLoginMenuOpen] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const navigate = useNavigate()
  const { signIn, signUp, resetPassword } = useAuth()

  const validateUsername = (username: string) => {
    if (username.length < 3) {
      return 'Username must be at least 3 characters long'
    }
    if (username.length > 20) {
      return 'Username must be less than 20 characters'
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isSignUp) {
        // Validate username
        const usernameError = validateUsername(username)
        if (usernameError) {
          setError(usernameError)
          return
        }

        // Check if username is already taken
        try {
          const isAvailable = await api.checkUsernameAvailability(username)
          if (!isAvailable) {
            setError('Username is already taken')
            return
          }
        } catch (err) {
          console.warn('Could not check username availability:', err)
          // Show a warning but allow signup to continue
          setMessage('Unable to verify username availability. Proceeding with signup...')
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match')
          return
        }

        // Sign up with Supabase
        const { error } = await signUp(email, password)
        if (error) {
          setError(error.message)
        } else {
          // Store the username temporarily for when the user confirms their email
          localStorage.setItem('pendingUsername', username)
          setMessage('Check your email for the confirmation link!')
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        } else {
          navigate('/')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await resetPassword(email)
    if (error) {
      setError(error.message)
    } else {
      setMessage('Password reset email sent!')
    }
    setLoading(false)
  }

  return (
    <div className="login-screen">
      <div className="login-content">
        <h1 className="login-title">Buzz</h1>
        <img
          src="/IMG_0203.svg"
          alt="Buzz"
          className="login-logo"
        />
        <div className="login-buttons">
          <button
            type="button"
            className="login-btn"
            onClick={() => {
              setLoginMenuOpen(true)
              setIsSignUp(false)
            }}
          >
            Login
          </button>
          <button
            type="button"
            className="login-btn"
            onClick={() => {
              setLoginMenuOpen(true)
              setIsSignUp(true)
            }}
          >
            Sign Up
          </button>
        </div>
      </div>

      {loginMenuOpen && (
        <div
          className="login-menu-backdrop"
          onClick={() => setLoginMenuOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setLoginMenuOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close login menu"
        >
          <div
            className="login-menu"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="login-menu-header">
              <h2 className="login-menu-title">
                {isSignUp ? 'Sign Up' : 'Login'}
              </h2>
              <button
                type="button"
                className="login-menu-close"
                onClick={() => setLoginMenuOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form className="login-menu-form" onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              {message && <div className="success-message">{message}</div>}

              <label className="login-menu-label">
                Email
                <input
                  type="email"
                  className="login-menu-input"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>

              {isSignUp && (
                <label className="login-menu-label">
                  Username
                  <input
                    type="text"
                    className="login-menu-input"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    minLength={3}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_]+"
                    title="Username can only contain letters, numbers, and underscores"
                  />
                </label>
              )}

              <label className="login-menu-label">
                Password
                <input
                  type="password"
                  className="login-menu-input"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
              </label>

              {isSignUp && (
                <label className="login-menu-label">
                  Confirm Password
                  <input
                    type="password"
                    className="login-menu-input"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </label>
              )}

              <button
                type="submit"
                className="login-btn login-menu-submit"
                disabled={loading}
              >
                {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Log in')}
              </button>

              {!isSignUp && (
                <button
                  type="button"
                  className="forgot-password-btn"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  Forgot Password?
                </button>
              )}

              <button
                type="button"
                className="switch-mode-btn"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                  setMessage('')
                  setUsername('')
                }}
              >
                {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign up"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
