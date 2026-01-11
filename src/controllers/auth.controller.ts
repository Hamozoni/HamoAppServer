// src/controllers/auth.controller.ts
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/user.model.js';
import otpService from '../services/otp.services.js';
import jwtService from '../services/jwt.services.js';
import type { IAuthRequest, IDeviceInfo } from '../types/index.js';

class AuthController {
  
  // Step 1: Send OTP
  async sendOTP(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.body;

      const result = await otpService.sendOTP(phoneNumber);

      if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
      }

      res.json({
        success: true,
        message: 'OTP sent successfully',
        expiresIn: result.expiresIn
      });
    } catch (error: any) {
      console.error('Send OTP error:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  }

  // Step 2: Verify OTP and Sign In/Register
  async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, otp, deviceInfo, displayName } = req.body;

      // Verify OTP
      const verification = await otpService.verifyOTP(phoneNumber, otp);

      if (!verification.success) {
        res.status(400).json({ error: verification.error });
        return;
      }

      // Find or create user
      let user = await User.findOne({ phoneNumber });
      let isNewUser = false;

      if (!user) {
        // Register new user
        user = await User.create({
          phoneNumber,
          displayName: displayName || undefined,
          isPhoneVerified: true
        });
        isNewUser = true;
      } else {
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
        (d: { platform: string; deviceName: string }) => d.platform === deviceInfo.platform && d.deviceName === deviceInfo.deviceName
      );

      if (existingDeviceIndex >= 0) {
        const existingDevice = user.devices[existingDeviceIndex];
        if (existingDevice) {
          existingDevice.deviceId = deviceId;
          existingDevice.lastActive = new Date();
        }
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

  // Resend OTP
  async resendOTP(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.body;

      const result = await otpService.resendOTP(phoneNumber);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({
        success: true,
        message: 'OTP resent successfully',
        expiresIn: result.expiresIn
      });
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ error: 'Failed to resend OTP' });
    }
  }

  // Refresh access token
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken, deviceId } = req.body as { refreshToken?: string; deviceId?: string };

      if (!refreshToken || !deviceId) {
        res.status(400).json({ error: 'Refresh token and device ID required' });
        return;
      }

      // Verify refresh token
      const decoded = jwtService.verifyRefreshToken(refreshToken);

      // Find user
      const user = await User.findById(decoded.userId);

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      // Check if refresh token exists and is valid
      const storedToken = user.refreshTokens.find(
        (rt: { token: string; deviceId: string }) => rt.token === refreshToken && rt.deviceId === deviceId
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

      // Optionally rotate refresh token (more secure)
      user.refreshTokens = user.refreshTokens.filter(
        (rt: { token: string }) => rt.token !== refreshToken
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

  // Logout
  async logout(req: IAuthRequest, res: Response): Promise<void> {
    try {
      const { deviceId , refreshToken } = req.body;
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

  // Logout from all devices
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

  // Get current user
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

  // Update profile
  async updateProfile(req: IAuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { displayName, about, profilePicture } = req.body as { displayName?: string; about?: string; profilePicture?: string };

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