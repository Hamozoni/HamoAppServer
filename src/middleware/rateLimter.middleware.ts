// src/middleware/rateLimiter.middleware.ts
import rateLimit from 'express-rate-limit';

// OTP sending rate limiter
export const otpLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5'),
  message: 'Too many OTP requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Login rate limiter
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many login attempts, please try again later'
});