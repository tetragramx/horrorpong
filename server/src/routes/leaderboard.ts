import { Router } from 'express';
import { User } from '../models/User';

export const leaderboardRouter = Router();

leaderboardRouter.get('/', async (_req, res) => {
  const users = await User.find({}, { username: 1, highscore: 1 })
    .sort({ highscore: -1, username: 1 })
    .limit(50);

  const leaderboard = users.map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    username: user.username,
    highscore: user.highscore,
  }));

  res.json({ leaderboard });
});
