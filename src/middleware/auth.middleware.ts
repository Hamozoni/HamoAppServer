// src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import jwtService from '../services/jwt.service.js';
import User from '../models/user.model.js';
import type { IAuthRequest } from '../types/index.js';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token : string = authHeader.split(' ')[1] as string;

    // Verify token
    const decoded = jwtService.verifyAccessToken(token);

    // Get user
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Attach user to request
    (req as IAuthRequest).user = user;
    (req as IAuthRequest).userId = user._id.toString();

    next();
  } catch (error: any) {
    if (error.message === 'Access token expired') {
      res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }

    res.status(401).json({ error: 'Invalid token' });
  }
};