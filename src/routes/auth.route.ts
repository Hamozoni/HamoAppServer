
import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  validatePhoneNumber,
  validateOTP,
  validateDeviceInfo,
  validateDisplayName,
  handleValidationErrors
} from '../middleware/validation.middleware.js';
import { otpLimiter, loginLimiter } from '../middleware/rateLimter.middleware.js';
import { body } from 'express-validator';

const router = Router();

// Public routes

// Send OTP
router.post(
  '/send-otp',
  otpLimiter,
  validatePhoneNumber,
  handleValidationErrors,
  authController.sendOTP
);

// Verify OTP and Sign In/Register
router.post(
  '/verify-otp',
  loginLimiter,
  [
    ...validatePhoneNumber,
    ...validateOTP,
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
  validatePhoneNumber,
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

// Get current user
router.get('/me', authMiddleware, authController.getMe);

// Update profile
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

// Logout
router.post(
  '/logout',
  authMiddleware,
  authController.logout
);

// Logout from all devices
router.post(
  '/logout-all',
  authMiddleware,
  authController.logoutAll
);

export default router;
