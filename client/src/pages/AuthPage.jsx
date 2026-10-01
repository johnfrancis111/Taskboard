import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { login, signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErrors({});
    setFormError('');
    setBusy(true);
    try {
      await (isSignup ? signup : login)(email, password);
      // On success the router redirects to the board.
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <section className="auth-panel" aria-labelledby="auth-title">
        <p className="wordmark">Taskboard</p>
        <h1 id="auth-title">{isSignup ? 'Create your account' : 'Sign in to your board'}</h1>
        <p className="auth-lede">
          Your tasks are private. Only you can see what’s on your board.
        </p>

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              required
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              required
            />
            {isSignup && !errors.password && <p className="field-hint">At least 8 characters.</p>}
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          <p className="form-error" role="alert" aria-live="polite">{formError}</p>

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? 'Already have an account?' : 'New here?'}{' '}
          <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create an account'}</Link>
        </p>
      </section>
    </main>
  );
}
