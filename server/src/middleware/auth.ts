import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

interface JwtClaims {
  userId: string;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid authorization token.' });
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtClaims;
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: 'Token is invalid or expired.' });
  }
}
