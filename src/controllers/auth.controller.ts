// src/controllers/auth.controller.ts
import type { NextFunction, Request, Response } from 'express';
import User from '../models/user.model.js';

import TwilioService from '../services/twilio.service.js';
import Device from '../models/device.model.js';
import Session from '../models/session.model.js';
import jwtService from '../services/jwt.service.js';

class AuthController {

  async sendOTP(req: Request, res: Response, next: NextFunction): Promise<void> {

    try {
      const { phoneNumber } = req.body;
      console.log(`📱 Sending OTP to ${phoneNumber}`);
      const result = await TwilioService.sendVerificationCode(phoneNumber);

      console.log(result);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({
        success: true,
        message: `Verification code sent via sms`,
        expiresIn: result.expiresIn,
      });
      next()
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to send verification code' });
    }
  };

  async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, otp, device } = req.body;
      console.log(`📱 Verifying OTP for ${{ phoneNumber, otp, device }}`);
      if (!phoneNumber || !otp || !device?.deviceId) {
        res.status(400).json({ message: "Invalid request" });
        return;
      }

      // 1️⃣ Verify OTP with Twilio
      const verification = await TwilioService.verifyCode(phoneNumber, otp);

      if (!verification.success) {
        res.status(401).json({ message: "Invalid OTP" });
        return;
      }

      // 2️⃣ Create or fetch user
      let user = await User.findOne({ phoneNumber });

      if (!user) {
        user = await User.create({
          phoneNumber,
          isPhoneVerified: true
        });
      }

      // 3️⃣ Register / update device
      await Device.findOneAndUpdate(
        { userId: user._id, deviceId: device.deviceId },
        {
          userId: user._id,
          isPrimary: true,
          ...device
        },
        { upsert: true }
      );

      // 4️⃣ Create refresh token

      const { refreshTokenHash, refreshToken } = jwtService.generateRefreshToken({
        userId: user._id.toString(),
        deviceId: device.deviceId,
        type: "refresh"
      });

      // 5️⃣ Save session
      await Session.create({
        userId: user._id,
        deviceId: device.deviceId,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      });

      // 6️⃣ Create access token
      const accessToken = jwtService.generateAccessToken({
        userId: user._id.toString(),
        deviceId: device.deviceId,
        type: "access"
      });

      res.json({
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber
        },
        accessToken,
        refreshToken
      });
      return;
    }
    catch (error: any) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ error: 'Failed to resend verification code' });
    }
  };

  // async refreshToken(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { refreshToken, deviceId } = req.body;

  //     if (!refreshToken || !deviceId) {
  //       res.status(400).json({ error: 'Refresh token and device ID required' });
  //       return;
  //     }

  //     // Verify refresh token
  //     const jwtService = require('../services/jwt.service').default;
  //     const decoded = jwtService.verifyRefreshToken(refreshToken);

  //     // Find user
  //     const user = await User.findById(decoded.userId);

  //     if (!user) {
  //       res.status(401).json({ error: 'User not found' });
  //       return;
  //     }

  //     // Check if refresh token exists and is valid
  //     const storedToken = user.refreshTokens.find(
  //       rt => rt.token === refreshToken && rt.deviceId === deviceId
  //     );

  //     if (!storedToken) {
  //       res.status(401).json({ error: 'Invalid refresh token' });
  //       return;
  //     }

  //     if (storedToken.expiresAt < new Date()) {
  //       res.status(401).json({ error: 'Refresh token expired' });
  //       return;
  //     }

  //     // Generate new access token
  //     const accessToken = user.generateAccessToken();

  //     // Rotate refresh token (security best practice)
  //     user.refreshTokens = user.refreshTokens.filter(
  //       rt => rt.token !== refreshToken
  //     );

  //     const newRefreshToken = user.generateRefreshToken(
  //       deviceId,
  //       storedToken.deviceInfo
  //     );

  //     await user.save();

  //     res.json({
  //       success: true,
  //       accessToken,
  //       refreshToken: newRefreshToken
  //     });
  //   } catch (error: any) {
  //     console.error('Refresh token error:', error);
  //     res.status(401).json({ error: 'Invalid refresh token' });
  //   }
  // }

  // async logout(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { deviceId, refreshToken } = req.body;
  //     const user = req.user!;

  //     // Remove refresh token
  //     if (refreshToken) {
  //       user.refreshTokens = user.refreshTokens.filter(
  //         rt => rt.token !== refreshToken
  //       );
  //     } else if (deviceId) {
  //       user.refreshTokens = user.refreshTokens.filter(
  //         rt => rt.deviceId !== deviceId
  //       );
  //     }

  //     // Remove device
  //     if (deviceId) {
  //       user.devices = user.devices.filter(d => d.deviceId !== deviceId);
  //     }

  //     await user.save();

  //     res.json({ success: true, message: 'Logged out successfully' });
  //   } catch (error: any) {
  //     console.error('Logout error:', error);
  //     res.status(500).json({ error: 'Logout failed' });
  //   }
  // };

  // async logoutAll(req: Request, res: Response): Promise<void> {
  //   try {
  //     const user = req.user!;

  //     user.refreshTokens = [];
  //     user.devices = [];

  //     await user.save();

  //     res.json({ success: true, message: 'Logged out from all devices' });
  //   } catch (error: any) {
  //     console.error('Logout all error:', error);
  //     res.status(500).json({ error: 'Logout failed' });
  //   }
  // };

  // async getMe(req: Request, res: Response): Promise<void> {
  //   try {
  //     const user = req.user!;

  //     res.json({
  //       id: user._id,
  //       phoneNumber: user.phoneNumber,
  //       displayName: user.displayName,
  //       profilePicture: user.profilePicture,
  //       about: user.about,
  //       isPhoneVerified: user.isPhoneVerified,
  //       devices: user.devices.map(d => ({
  //         deviceId: d.deviceId,
  //         platform: d.platform,
  //         deviceName: d.deviceName,
  //         lastActive: d.lastActive
  //       })),
  //       createdAt: user.createdAt,
  //       lastSeen: user.lastSeen
  //     });
  //   } catch (error: any) {
  //     res.status(500).json({ error: 'Failed to get user' });
  //   }
  // };

  // async updateProfile(req: Request, res: Response): Promise<void> {
  //   try {
  //     const user = req.user!;
  //     const { displayName, about, profilePicture } = req.body;

  //     if (displayName !== undefined) user.displayName = displayName;
  //     if (about !== undefined) user.about = about;
  //     if (profilePicture !== undefined) user.profilePicture = profilePicture;

  //     await user.save();

  //     res.json({
  //       success: true,
  //       user: {
  //         id: user._id,
  //         phoneNumber: user.phoneNumber,
  //         displayName: user.displayName,
  //         profilePicture: user.profilePicture,
  //         about: user.about
  //       }
  //     });
  //   } catch (error: any) {
  //     res.status(500).json({ error: 'Failed to update profile' });
  //   }
  // }
}

export default new AuthController();