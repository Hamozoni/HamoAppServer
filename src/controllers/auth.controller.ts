// src/controllers/auth.controller.ts
import type { NextFunction, Request, Response } from 'express';
import User from '../models/user.model.js';
import TwilioService from '../services/twilio.service.js';
import Device from '../models/device.model.js';
import Session from '../models/session.model.js';
import jwtService from '../services/jwt.service.js';
import refreshTokenBlacklistModel from '../models/refreshTokenBlacklist.model.js';

class AuthController {

  async sendOTP(req: Request, res: Response, next: NextFunction): Promise<void> {

    try {
      const { phoneNumber } = req.body;
      console.log(`📱 Sending OTP to ${phoneNumber}`);
      // const result = await TwilioService.sendVerificationCode(phoneNumber);

      // console.log(result);

      // if (!result.success) {
      //   res.status(400).json({ error: result.error });
      //   return;
      // }

      res.json({
        success: true,
        message: `Verification code sent via sms`,
        expiresIn: "5m",
      });
      next()
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to send verification code' });
    }
  };

  async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, otp, device, countryISO, countryCode } = req.body;

      console.log({ phoneNumber, otp, device, countryISO, countryCode, ip: req.ip })
      console.log(`📱 Verifying OTP for ${{ phoneNumber, otp, device }}`);
      if (!phoneNumber || !otp || !device?.deviceId) {
        res.status(400).json({ message: "Invalid request" });
        return;
      }

      // 1️⃣ Verify OTP with Twilio
      // const verification = await TwilioService.verifyCode(phoneNumber, otp);

      // if (!verification.success) {
      //   res.status(401).json({ message: "Invalid OTP" });
      //   return;
      // }

      // 2️⃣ Create or fetch user
      let user = await User.findOne({ phoneNumber }).select("_id displayName about phoneNumber").populate("profilePicture", "secureUrl");
      console.log({ user })
      if (!user) {
        user = await User.create({
          phoneNumber,
          countryISO,
          countryCode,
          displayName: device.deviceName,
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

      const refreshToken = jwtService.generateRefreshToken({
        userId: user._id.toString(),
        deviceId: device.deviceId,
        type: "refresh"
      });

      const refreshTokenHash = jwtService.hashRefreshToken(refreshToken);

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
        user,
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

  async refreshToken(req: Request, res: Response): Promise<any> {
    try {
      const { refreshToken } = req.body;

      console.log(refreshToken);

      // Validate input
      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token required" });
      }

      // if (!userId) {
      //   res.status(401).json({ message: "User ID required" });
      //   return;
      // }

      // 1️⃣ Verify refresh token (JWT signature + expiry)
      const payload = jwtService.verifyRefreshToken(refreshToken);



      // Validate token type
      if (payload.type !== "refresh") {
        return res.status(401).json({ message: "Invalid token type" });
      }

      // Ensure userId matches
      // if (payload.userId !== userId) {
      //   res.status(401).json({ message: "User ID mismatch" });
      //   return;
      // }

      const { deviceId, userId } = payload;

      // 2️⃣ Hash provided refresh token
      const refreshTokenHash = jwtService.hashRefreshToken(refreshToken);

      // 3️⃣ Check if token is blacklisted (logged out)
      const isBlacklisted = await refreshTokenBlacklistModel.findOne({
        tokenHash: refreshTokenHash,
      });

      if (isBlacklisted) {
        res.status(401).json({ message: "Refresh token has been revoked" });
        return;
      }

      // 4️⃣ Find active session with atomic update (prevents race conditions)


      const session = await Session.findOneAndUpdate(
        {
          userId,
          deviceId,
          refreshTokenHash, // Ensure we're updating the correct token
          revoked: false,
          expiresAt: { $gt: new Date() },
        },
        {
          $inc: { refreshTokenVersion: 1 }, // Increment version atomically
        },
        { new: false } // Get old document to verify it existed
      );

      if (!session) {
        // Token reuse detected or session not found
        // Attempt to revoke all sessions for this user on this device
        await Session.updateMany(
          { userId, deviceId },
          { revoked: true },
          { multi: true }
        );

        res.status(401).json({
          message:
            "Invalid refresh session. Possible token reuse detected. All sessions revoked.",
        });
        return;
      }

      // 5️⃣ Generate new refresh token
      const newRefreshToken = jwtService.generateRefreshToken({
        userId,
        deviceId,
        type: "refresh",
      });

      const newRefreshTokenHash = jwtService.hashRefreshToken(
        newRefreshToken
      );
      const refreshTTL = 30 * 24 * 60 * 60 * 1000; // 30 days

      // 6️⃣ Update session with new token hash (atomic operation)
      const updatedSession = await Session.findByIdAndUpdate(
        session._id,
        {
          refreshTokenHash: newRefreshTokenHash,
          expiresAt: new Date(Date.now() + refreshTTL),
          lastUsedAt: new Date(),
        },
        { new: true }
      );

      if (!updatedSession) {
        res.status(500).json({ message: "Failed to update session" });
        return;
      }

      // 7️⃣ Blacklist old refresh token
      try {
        await refreshTokenBlacklistModel.create({
          tokenHash: refreshTokenHash,
          userId,
          expiresAt: new Date(Date.now() + refreshTTL),
        });
      } catch (err: any) {
        // Ignore duplicate key errors (token already blacklisted)
        if (err.code !== 11000) {
          console.error("Error blacklisting old token:", err);
        }
      }

      // 8️⃣ Issue new access token
      const accessToken = jwtService.generateAccessToken({
        userId,
        deviceId,
        type: "access",
      });

      return res.status(200).json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error: any) {
      console.error("Refresh token error:", error.message);

      // Don't expose internal error details to client
      return res.status(401).json({
        message: "Token refresh failed",
      });
    }


    // async refreshToken(req: Request, res: Response) {
    //   try {
    //     const { refreshToken } = req.body;

    //     if (!refreshToken) {
    //       return res.status(401).json({ message: "Refresh token required" });
    //     }

    //     // 1️⃣ Verify refresh token (JWT + expiry)
    //     const payload = jwtService.verifyRefreshToken(refreshToken);

    //     if (payload.type !== "refresh") {
    //       return res.status(401).json({ message: "Invalid token type" });
    //     }

    //     const { userId, deviceId } = payload;

    //     // 2️⃣ Hash provided refresh token
    //     const refreshTokenHash = jwtService.hashRefreshToken(refreshToken);

    //     // 3️⃣ Find active session
    //     const session = await Session.findOne({
    //       userId,
    //       deviceId,
    //       revoked: false,
    //       expiresAt: { $gt: new Date() },
    //     });

    //     if (!session || session.refreshTokenHash !== refreshTokenHash) {
    //       // Refresh token reuse or stolen token
    //       if (session) {
    //         session.revoked = true;
    //         await session.save();
    //       }

    //       return res.status(401).json({ message: "Invalid refresh session" });
    //     }

    //     // 4️⃣ Rotate refresh token
    //     const newRefreshToken = jwtService.generateRefreshToken({
    //       userId,
    //       deviceId,
    //       type: "refresh",
    //     });

    //     const newRefreshTokenHash = jwtService.hashRefreshToken(newRefreshToken);
    //     // Refresh token TTL (match JWT expiry)
    //     const refreshTTL = 30 * 24 * 60 * 60 * 1000; // 30 days

    //     session.refreshTokenHash = newRefreshTokenHash;
    //     session.expiresAt = new Date(Date.now() + refreshTTL);
    //     session.lastUsedAt = new Date();
    //     await session.save();

    //     // 5️⃣ Issue new access token
    //     const accessToken = jwtService.generateAccessToken({
    //       userId,
    //       deviceId,
    //       type: "access",
    //     });

    //     return res.json({
    //       accessToken,
    //       refreshToken: newRefreshToken,
    //       expiresIn: 15 * 60, // seconds
    //     });
    //   } catch (error: any) {
    //     console.error("Refresh error:", error.message);

    //     return res.status(401).json({
    //       message: error.message || "Refresh failed",
    //     });
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

}

export default new AuthController();