import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { AuthPanel } from './components/AuthPanel';
import { Leaderboard } from './components/Leaderboard';
import { PongCanvas } from './components/PongCanvas';
import { getLeaderboard, login, register, submitScore, type LeaderboardEntry, type User } from './lib/api';

type Mode = 'single' | 'multi';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<Mode>('single');
  const [token, setToken] = useState<string | null>(localStorage.getItem('pong-token'));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('pong-user');
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [toast, setToast] = useState('Playing as guest. Sign in to save highscores.');

  const refreshLeaderboard = useCallback(async () => {
    const next = await getLeaderboard();
    setLeaderboard(next);
  }, []);

  useEffect(() => {
    refreshLeaderboard().catch(() => {
      console.log('Could not load leaderboard');
    });
  }, [refreshLeaderboard]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const setSession = useCallback((nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem('pong-token', nextToken);
    localStorage.setItem('pong-user', JSON.stringify(nextUser));
  }, []);

  const handleLogin = useCallback(async (payload: { email: string; password: string }) => {
    const response = await login(payload);
    setSession(response.token, response.user);
    setToast(`Welcome back, ${response.user.username}.`);
    await refreshLeaderboard();
  }, [refreshLeaderboard, setSession]);

  const handleRegister = useCallback(async (payload: { username: string; email: string; password: string }) => {
    const response = await register(payload);
    setSession(response.token, response.user);
    setToast(`Account created for ${response.user.username}.`);
    await refreshLeaderboard();
  }, [refreshLeaderboard, setSession]);

  const handleLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('pong-token');
    localStorage.removeItem('pong-user');
    setToast('Signed out. You are playing as guest now.');
  }, []);

  const handleFinishedGame = useCallback(async (score: number) => {
    if (!token || !user) {
      setToast(`Game finished. Guest score: ${score}. Sign in to save it.`);
      return;
    }

    const payload = await submitScore(score, token);
    const updatedUser = { ...user, highscore: payload.highscore };
    setUser(updatedUser);
    localStorage.setItem('pong-user', JSON.stringify(updatedUser));
    setToast(`Game finished. Score ${score}. Best score: ${payload.highscore}.`);
    await refreshLeaderboard();
  }, [refreshLeaderboard, token, user]);

  const rankText = useMemo(() => {
    if (!user) {
      return 'Guest';
    }
    const rank = leaderboard.find((entry) => entry.userId === user.id)?.rank;
    return rank ? `#${rank}` : 'Unranked';
  }, [leaderboard, user]);

  return (
    <div className="app-shell">
      {showSplash ? (
        <div className="splash-screen" aria-label="Horror Pong splash screen">
          <h1 className="splash-title">Horror Pong</h1>
          <div className="blade-loader" aria-hidden="true">
            <span className="blade blade-a" />
            <span className="blade blade-b" />
            <span className="blade blade-c" />
            <span className="blade blade-d" />
          </div>
          <p className="splash-subtitle">Sharpening the blades...</p>
        </div>
      ) : null}

      <header className="topbar animate-rise">
        <div>
          <h1>Horror Pong</h1>
          <p>Step into the abyss. Play instantly as a guest, or sign up and rise through the damned demon ranks.</p>
        </div>
        <div className="topbar-meta">
          <span className="pill">Mode: {mode === 'single' ? 'Solo vs Bot' : 'Multiplayer'}</span>
          <span className="pill">Rank: {rankText}</span>
        </div>
      </header>

      <main className="grid-layout">
        <div className="stack-lg animate-rise delay-1">
          <PongCanvas mode={mode} onGameFinished={(score) => {
            handleFinishedGame(score).catch((error) => {
              setToast(error instanceof Error ? error.message : 'Could not save score.');
            });
          }} />

          <div className="mode-toggle">
            <button
              type="button"
              className={`button ${mode === 'single' ? '' : 'secondary'}`}
              onClick={() => setMode('single')}
            >
              Play Bot
            </button>
            <button
              type="button"
              className={`button ${mode === 'multi' ? '' : 'secondary'}`}
              onClick={() => setMode('multi')}
            >
              Play Multiplayer
            </button>
          </div>

          <div className="panel notice animate-rise delay-2">{toast}</div>
        </div>

        <div className="stack-lg animate-rise delay-2">
          <AuthPanel
            isAuthenticated={Boolean(token && user)}
            currentUsername={user?.username}
            onLogin={handleLogin}
            onRegister={handleRegister}
            onLogout={handleLogout}
          />
          <Leaderboard entries={leaderboard} currentUser={user} />
        </div>
      </main>
    </div>
  );
}

export default App;
