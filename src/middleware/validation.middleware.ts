// src/middleware/validation.middleware.ts
import { body, validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

export const validatePhoneNumber = [
  body('phoneNumber')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+[1-9]\d{1,14}$/).withMessage('Invalid phone number format. Use E.164 format (e.g., +966512345678)')
];

export const validateOTP = [
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers')
];


export const validateDisplayName = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 25 })
    .withMessage('Display name must be between 1 and 25 characters')
];

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};