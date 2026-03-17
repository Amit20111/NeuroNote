import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../services/api';

interface AuthPageProps {
  onNavigate: (route: string) => void;
}

export default function AuthPage({ onNavigate }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, continueAsGuest } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/signup';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      login(data.user, data.token);
      onNavigate(''); // Navigate to Dashboard/Home
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    continueAsGuest();
    onNavigate(''); // Navigate to Dashboard/Home
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="sidebar-logo auth-logo">
            Neuro<span className="logo-flow">Note</span>
          </div>
          <h2>{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
          <p className="auth-subtitle">
            {isLogin ? 'Sign in to access your library' : 'Start saving your notes securely'}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="primary-button full-width" disabled={loading}>
            {loading ? (
              <span className="spinner"></span>
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button 
          onClick={handleGuestLogin} 
          className="secondary-button full-width guest-button"
        >
          Continue as Guest
          <span className="guest-tooltip">History won't be saved</span>
        </button>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              className="text-button"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
