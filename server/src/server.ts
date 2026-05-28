import 'dotenv/config';
import http from 'node:http';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { authRouter } from './routes/auth';
import { leaderboardRouter } from './routes/leaderboard';
import { scoreRouter } from './routes/scores';
import { wireMultiplayer } from './socket/multiplayer';

const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

if (!MONGO_URI) {
  throw new Error('MONGO_URI is required in environment.');
}

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required in environment.');
}

async function bootstrap(): Promise<void> {
  await mongoose.connect(MONGO_URI as string);

  const app = express();
  app.use(cors({ origin: CLIENT_ORIGIN }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/auth', authRouter);
  app.use('/leaderboard', leaderboardRouter);
  app.use('/scores', scoreRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: 'Unexpected server error.' });
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: CLIENT_ORIGIN,
      methods: ['GET', 'POST'],
    },
  });

  wireMultiplayer(io);

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap server:', error);
  process.exit(1);
});
