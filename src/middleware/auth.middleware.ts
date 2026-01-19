// src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import jwtService from '../services/jwt.service.js';
import User from '../models/user.model.js';


export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    console.log(authHeader);


    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }


    const token: string = authHeader.split(' ')[1] as string;

    // Verify token

    const decoded = jwtService.verifyAccessToken(token);

    // Get user
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    (req as any).user = user;
    (req as any).userId = user._id.toString();

    next();
  } catch (error: any) {

    if (error.message === 'Access token expired') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({ error: 'Invalid token' });
  }
};