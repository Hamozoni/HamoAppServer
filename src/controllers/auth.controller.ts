// src/controllers/auth.controller.ts
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/user.model.js';
import otpService from '../services/otp.services.js';
import type { IAuthRequest } from '../types/index.js';

class AuthController {
  
  /**
   * Step 1: Send OTP
   * POST /api/auth/send-otp
   * Body: { phoneNumber: string, channel?: 'sms' | 'call' }
   */
  async sendOTP(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, channel = 'sms' } = req.body;

      console.log(`📱 Sending OTP to ${phoneNumber} via ${channel}`);

      const result = await otpService.sendOTP(phoneNumber, channel);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({
        success: true,
        message: `Verification code sent via ${channel}`,
        expiresIn: result.expiresIn,
        sid: result.sid // Optional: can be used for tracking
      });
    } catch (error: any) {
      console.error('Send OTP error:', error);
      res.status(500).json({ error: 'Failed to send verification code' });
    }
  }

  /**
   * Step 2: Verify OTP and Sign In/Register
   * POST /api/auth/verify-otp
   * Body: { phoneNumber, code, deviceInfo, displayName? }
   */
  async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, code, deviceInfo, displayName } = req.body;

      console.log(`🔐 Verifying OTP for ${phoneNumber}`);

      // Verify OTP via Twilio
      const verification = await otpService.verifyOTP(phoneNumber, code);

      if (!verification.success) {
        res.status(400).json({ error: verification.error });
        return;
      }

      console.log(`✅ OTP verified for ${phoneNumber}`);

      // Find or create user
      let user = await User.findOne({ phoneNumber });
      let isNewUser = false;

      if (!user) {
        console.log(`👤 Creating new user: ${phoneNumber}`);
        
        // Register new user
        user = await User.create({
          phoneNumber,
          displayName: displayName || undefined,
          isPhoneVerified: true
        });
        isNewUser = true;
      } else {
        console.log(`👤 User found: ${phoneNumber}`);
        
        // Update verification status
        if (!user.isPhoneVerified) {
          user.isPhoneVerified = true;
        }
        user.lastSeen = new Date();
      }

      // Generate device ID
      const deviceId = uuidv4();

      // Add/update device
      const existingDeviceIndex = user.devices.findIndex(
        d => d.platform === deviceInfo.platform && d.deviceName === deviceInfo.deviceName
      );

      if (existingDeviceIndex >= 0) {
        user.devices[existingDeviceIndex].deviceId = deviceId;
        user.devices[existingDeviceIndex].lastActive = new Date();
      } else {
        user.devices.push({
          deviceId,
          platform: deviceInfo.platform,
          deviceName: deviceInfo.deviceName,
          lastActive: new Date()
        });
      }

      // Generate tokens
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken(deviceId, deviceInfo);

      // Clean expired tokens
      user.cleanExpiredTokens();

      await user.save();

      console.log(`🎉 ${isNewUser ? 'Registration' : 'Login'} successful for ${phoneNumber}`);

      res.status(isNewUser ? 201 : 200).json({
        success: true,
        isNewUser,
        accessToken,
        refreshToken,
        deviceId,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          displayName: user.displayName,
          profilePicture: user.profilePicture,
          about: user.about,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt
        }
      });
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  }

  /**
   * Resend OTP
   * POST /api/auth/resend-otp
   * Body: { phoneNumber, channel?: 'sms' | 'call' }
   */
  async resendOTP(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, channel = 'sms' } = req.body;

      console.log(`🔄 Resending OTP to ${phoneNumber}`);

      const result = await otpService.resendOTP(phoneNumber, channel);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({
        success: true,
        message: 'Verification code resent',
        expiresIn: result.expiresIn
      });
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ error: 'Failed to resend verification code' });
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh-token
   * Body: { refreshToken, deviceId }
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken, deviceId } = req.body;

      if (!refreshToken || !deviceId) {
        res.status(400).json({ error: 'Refresh token and device ID required' });
        return;
      }

      // Verify refresh token
      const jwtService = require('../services/jwt.service').default;
      const decoded = jwtService.verifyRefreshToken(refreshToken);

      // Find user
      const user = await User.findById(decoded.userId);

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      // Check if refresh token exists and is valid
      const storedToken = user.refreshTokens.find(
        rt => rt.token === refreshToken && rt.deviceId === deviceId
      );

      if (!storedToken) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      if (storedToken.expiresAt < new Date()) {
        res.status(401).json({ error: 'Refresh token expired' });
        return;
      }

      // Generate new access token
      const accessToken = user.generateAccessToken();

      // Rotate refresh token (security best practice)
      user.refreshTokens = user.refreshTokens.filter(
        rt => rt.token !== refreshToken
      );

      const newRefreshToken = user.generateRefreshToken(
        deviceId,
        storedToken.deviceInfo
      );

      await user.save();

      res.json({
        success: true,
        accessToken,
        refreshToken: newRefreshToken
      });
    } catch (error: any) {
      console.error('Refresh token error:', error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  /**
   * Logout from current device
   * POST /api/auth/logout
   * Body: { deviceId?, refreshToken? }
   */
  async logout(req: IAuthRequest, res: Response): Promise<void> {
    try {
      const { deviceId, refreshToken } = req.body;
      const user = req.user!;

      // Remove refresh token
      if (refreshToken) {
        user.refreshTokens = user.refreshTokens.filter(
          rt => rt.token !== refreshToken
        );
      } else if (deviceId) {
        user.refreshTokens = user.refreshTokens.filter(
          rt => rt.deviceId !== deviceId
        );
      }

      // Remove device
      if (deviceId) {
        user.devices = user.devices.filter(d => d.deviceId !== deviceId);
      }

      await user.save();

      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  /**
   * Logout from all devices
   * POST /api/auth/logout-all
   */
  async logoutAll(req: IAuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;

      user.refreshTokens = [];
      user.devices = [];

      await user.save();

      res.json({ success: true, message: 'Logged out from all devices' });
    } catch (error: any) {
      console.error('Logout all error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  /**
   * Get current user
   * GET /api/auth/me
   */
  async getMe(req: IAuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;

      res.json({
        id: user._id,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
        profilePicture: user.profilePicture,
        about: user.about,
        isPhoneVerified: user.isPhoneVerified,
        devices: user.devices.map(d => ({
          deviceId: d.deviceId,
          platform: d.platform,
          deviceName: d.deviceName,
          lastActive: d.lastActive
        })),
        createdAt: user.createdAt,
        lastSeen: user.lastSeen
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get user' });
    }
  }

  /**
   * Update profile
   * PATCH /api/auth/profile
   * Body: { displayName?, about?, profilePicture? }
   */
  async updateProfile(req: IAuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { displayName, about, profilePicture } = req.body;

      if (displayName !== undefined) user.displayName = displayName;
      if (about !== undefined) user.about = about;
      if (profilePicture !== undefined) user.profilePicture = profilePicture;

      await user.save();

      res.json({
        success: true,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          displayName: user.displayName,
          profilePicture: user.profilePicture,
          about: user.about
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
}

export default new AuthController();