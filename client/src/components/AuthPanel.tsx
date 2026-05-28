import { type FormEvent, useState } from 'react';

type AuthPanelProps = {
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onRegister: (payload: { username: string; email: string; password: string }) => Promise<void>;
  onLogout: () => void;
  isAuthenticated: boolean;
  currentUsername?: string;
};

export function AuthPanel({ onLogin, onRegister, onLogout, isAuthenticated, currentUsername }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) {
    return (
      <section className="panel auth-panel">
        <h2>Account</h2>
        <p>Signed in as <strong>{currentUsername}</strong>.</p>
        <button onClick={onLogout} className="button secondary" type="button">Log out</button>
      </section>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (mode === 'login') {
        await onLogin({ email, password });
      } else {
        await onRegister({ username, email, password });
      }
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel auth-panel">
      <div className="row-between">
        <h2>{mode === 'login' ? 'Log In' : 'Sign Up'}</h2>
        <button className="text-button" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need account?' : 'Have account?'}
        </button>
      </div>
      <p>Guest play works instantly. Sign in to save your best score.</p>
      <form onSubmit={submit} className="stack-sm">
        {mode === 'register' ? (
          <input
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            minLength={3}
            maxLength={24}
            required
          />
        ) : null}
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          maxLength={72}
          required
        />
        <button type="submit" className="button" disabled={busy}>
          {busy ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
