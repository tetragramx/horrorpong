export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export type User = {
  id: string;
  username: string;
  email: string;
  highscore: number;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  highscore: number;
};

type AuthResponse = {
  token: string;
  user: User;
};

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || 'Request failed.');
  }
  return payload as T;
}

export async function register(payload: { username: string; email: string; password: string }): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return parseJson<AuthResponse>(response);
}

export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return parseJson<AuthResponse>(response);
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await fetch(`${API_BASE}/leaderboard`);
  const payload = await parseJson<{ leaderboard: LeaderboardEntry[] }>(response);
  return payload.leaderboard;
}

export async function submitScore(score: number, token: string): Promise<{ highscore: number }> {
  const response = await fetch(`${API_BASE}/scores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ score }),
  });

  return parseJson<{ highscore: number }>(response);
}
