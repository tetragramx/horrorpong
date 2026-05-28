import type { LeaderboardEntry, User } from '../lib/api';

type LeaderboardProps = {
  entries: LeaderboardEntry[];
  currentUser: User | null;
};

export function Leaderboard({ entries, currentUser }: LeaderboardProps) {
  const currentRank = currentUser
    ? entries.find((entry) => entry.userId === currentUser.id)?.rank
    : undefined;

  return (
    <section className="panel leaderboard-panel">
      <h2>Leaderboard</h2>
      <p>{currentUser ? `Your rank: #${currentRank || 'unranked'}.` : 'Log in to join ranked players.'}</p>
      <ul className="leaderboard-list">
        {entries.slice(0, 10).map((entry) => (
          <li key={entry.userId} className={entry.userId === currentUser?.id ? 'is-self' : ''}>
            <span>#{entry.rank} {entry.username}</span>
            <strong>{entry.highscore}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
