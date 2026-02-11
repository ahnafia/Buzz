import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginScreen.css'

export default function LoginScreen() {
  const [loginMenuOpen, setLoginMenuOpen] = useState(false)
  const navigate = useNavigate()

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
            onClick={() => setLoginMenuOpen(true)}
          >
            Login
          </button>
          <button
            type="button"
            className="login-btn"
            onClick={() => navigate('/info')}
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
              <h2 className="login-menu-title">Login</h2>
              <button
                type="button"
                className="login-menu-close"
                onClick={() => setLoginMenuOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form
              className="login-menu-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <label className="login-menu-label">
                Email or Username
                <input
                  type="text"
                  className="login-menu-input"
                  placeholder="Email or username"
                  autoComplete="username"
                />
              </label>
              <label className="login-menu-label">
                Password
                <input
                  type="password"
                  className="login-menu-input"
                  placeholder="Password"
                  autoComplete="current-password"
                />
              </label>
              <button type="submit" className="login-btn login-menu-submit">
                Log in
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
