// src/routes/auth.routes.ts
import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  validatePhoneNumber,
  validateDeviceInfo,
  validateDisplayName,
  handleValidationErrors
} from '../middleware/validation.middleware.js';
import { otpLimiter, loginLimiter } from '../middleware/rateLimter.middleware.js';
import { body } from 'express-validator';

const router = Router();

// Send OTP (SMS or Voice Call)
router.post(
  '/send-otp',
  otpLimiter,
  [
    ...validatePhoneNumber,
    body('channel')
      .optional()
      .isIn(['sms', 'call'])
      .withMessage('Channel must be sms or call')
  ],
  handleValidationErrors,
  authController.sendOTP
);

// Verify OTP and Sign In/Register
router.post(
  '/verify-otp',
  loginLimiter,
  [
    ...validatePhoneNumber,
    body('code')
      .trim()
      .notEmpty().withMessage('Verification code is required')
      .isLength({ min: 4, max: 6 }).withMessage('Code must be 4-6 digits')
      .isNumeric().withMessage('Code must contain only numbers'),
    ...validateDeviceInfo,
    ...validateDisplayName
  ],
  handleValidationErrors,
  authController.verifyOTP
);

// Resend OTP
router.post(
  '/resend-otp',
  otpLimiter,
  [
    ...validatePhoneNumber,
    body('channel')
      .optional()
      .isIn(['sms', 'call'])
      .withMessage('Channel must be sms or call')
  ],
  handleValidationErrors,
  authController.resendOTP
);

// Refresh token
router.post(
  '/refresh-token',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    body('deviceId').notEmpty().withMessage('Device ID is required')
  ],
  handleValidationErrors,
  authController.refreshToken
);

// Protected routes
router.get('/me', authMiddleware, authController.getMe);

router.patch(
  '/profile',
  authMiddleware,
  [
    body('displayName').optional().trim().isLength({ min: 1, max: 25 }),
    body('about').optional().trim().isLength({ max: 139 }),
    body('profilePicture').optional().isURL()
  ],
  handleValidationErrors,
  authController.updateProfile
);


router.post('/logout', authMiddleware, authController.logout);

router.post('/logout-all', authMiddleware, authController.logoutAll);

export default router;
