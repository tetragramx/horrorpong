import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const registerSchema = z.object({
  username: z.string().min(3).max(24),
  email: z.string().email(),
  password: z.string().min(6).max(72),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(72),
});

function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
}

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid registration payload.' });
    return;
  }

  const email = parsed.data.email.toLowerCase();

  const [existingByEmail, existingByUsername] = await Promise.all([
    User.findOne({ email }),
    User.findOne({ username: parsed.data.username }),
  ]);

  if (existingByEmail || existingByUsername) {
    res.status(409).json({ message: 'User with this email or username already exists.' });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await User.create({
    username: parsed.data.username,
    email,
    passwordHash,
  });

  const token = signToken(user.id);

  res.status(201).json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      highscore: user.highscore,
    },
  });
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid login payload.' });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const user = await User.findOne({ email });

  if (!user) {
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  const isValidPassword = await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!isValidPassword) {
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  const token = signToken(user.id);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      highscore: user.highscore,
    },
  });
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await User.findById(req.userId).select('username email highscore');

  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      highscore: user.highscore,
    },
  });
});
