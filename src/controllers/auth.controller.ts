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

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token required" });
      }

      // 1️⃣ Verify refresh token (JWT + expiry)
      const payload = jwtService.verifyRefreshToken(refreshToken);

      if (payload.type !== "refresh") {
        return res.status(401).json({ message: "Invalid token type" });
      }

      const { userId, deviceId } = payload;

      // 2️⃣ Hash provided refresh token
      const providedHash = jwtService.generateRefreshToken(refreshToken);

      // 3️⃣ Find active session
      const session = await Session.findOne({
        userId,
        deviceId,
        revoked: false,
        expiresAt: { $gt: new Date() },
      });

      if (!session || session.refreshTokenHash !== providedHash) {
        // Refresh token reuse or stolen token
        if (session) {
          session.revoked = true;
          await session.save();
        }

        return res.status(401).json({ message: "Invalid refresh session" });
      }

      // 4️⃣ Rotate refresh token
      const {
        refreshToken: newRefreshToken,
        refreshTokenHash: newRefreshTokenHash,
      } = jwtService.generateRefreshToken({
        userId,
        deviceId,
        type: "refresh",
      });

      // Refresh token TTL (match JWT expiry)
      const refreshTTL = 30 * 24 * 60 * 60 * 1000; // 30 days

      session.refreshTokenHash = newRefreshTokenHash;
      session.expiresAt = new Date(Date.now() + refreshTTL);
      session.lastUsedAt = new Date();
      await session.save();

      // 5️⃣ Issue new access token
      const accessToken = jwtService.generateAccessToken({
        userId,
        deviceId,
        type: "access",
      });

      return res.json({
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 15 * 60, // seconds
      });
    } catch (error: any) {
      console.error("Refresh error:", error.message);

      return res.status(401).json({
        message: error.message || "Refresh failed",
      });
    }
  }


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