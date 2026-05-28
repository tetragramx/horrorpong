import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';

const scoreSchema = z.object({
  score: z.number().int().min(0).max(999),
});

export const scoreRouter = Router();

scoreRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = scoreSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid score payload.' });
    return;
  }

  const user = await User.findById(req.userId);

  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  if (parsed.data.score > user.highscore) {
    user.highscore = parsed.data.score;
    await user.save();
  }

  res.json({
    highscore: user.highscore,
  });
});
