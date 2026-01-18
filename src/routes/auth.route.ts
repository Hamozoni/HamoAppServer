// src/routes/auth.routes.ts
import { Router } from 'express';
import authController from '../controllers/auth.controller.js';

import {
  validatePhoneNumber,
  handleValidationErrors,
  validateOTP
} from '../middleware/validation.middleware.js';
import { otpLimiter, loginLimiter } from '../middleware/rateLimter.middleware.js';

const router = Router();

router.post(
  '/send_otp',
  otpLimiter,
  [
    ...validatePhoneNumber,
  ],
  handleValidationErrors,
  authController.sendOTP
);

// Verify OTP and Sign In/Register
router.post(
  '/verify_otp',
  loginLimiter,
  [
    ...validatePhoneNumber,
    ...validateOTP
  ],
  handleValidationErrors,
  authController.verifyOTP
);

// Resend OTP
// router.post(
//   '/resend-otp',
//   otpLimiter,
//   [
//     ...validatePhoneNumber,
//   ],
//   handleValidationErrors,
//   authController.resendOTP
// );


router.post('/refresh_token', authController.refreshToken);

// Protected routes
// router.get('/me', authMiddleware, authController.getMe);

// router.patch(
//   '/profile',
//   authMiddleware,
//   [
//     body('displayName').optional().trim().isLength({ min: 1, max: 25 }),
//     body('about').optional().trim().isLength({ max: 139 }),
//     body('profilePicture').optional().isURL()
//   ],
//   handleValidationErrors,
//   authController.updateProfile
// );


// router.post('/logout', authMiddleware, authController.logout);

// router.post('/logout-all', authMiddleware, authController.logoutAll);

export default router;
