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

      if (!phoneNumber || !otp || !device?.deviceId) {
        res.status(400).json({ message: "Invalid request" });
        return;
      }

      // 1️⃣ Verify OTP
      // const verification = await TwilioService.verifyCode(phoneNumber, otp);
      // if (!verification.success) {
      //     res.status(401).json({ message: "Invalid OTP" });
      //     return;
      // }

      // 2️⃣ Create or fetch user
      let user = await User.findOne({ phoneNumber })
        .select("_id displayName about phoneNumber")
        .populate("profilePicture", "secureUrl");

      if (!user) {
        // ── Brand new user ──────────────────────
        user = await User.create({
          phoneNumber,
          countryISO,
          countryCode,
          displayName: device.deviceName,
          isPhoneVerified: true,
        });

        await Device.create({
          userId: user._id,
          isPrimary: true,
          ...device,
        });

      } else {
        // ── Existing user — handle primary device ─
        const existingPrimary = await Device.findOne({
          userId: user._id,
          isPrimary: true,
        });

        const isSameDevice = existingPrimary?.deviceId === device.deviceId;

        if (existingPrimary && !isSameDevice) {
          // 🔴 New device — revoke all sessions for old primary device
          await Session.updateMany(
            {
              userId: user._id,
              deviceId: existingPrimary.deviceId,
              revoked: false,
            },
            { revoked: true }
          );

          // Blacklist all active refresh tokens for old device
          const oldSessions = await Session.find({
            userId: user._id,
            deviceId: existingPrimary.deviceId,
          });

          await Promise.allSettled(
            oldSessions.map(s =>
              refreshTokenBlacklistModel.create({
                tokenHash: s.refreshTokenHash,
                userId: user!._id.toString(),
                expiresAt: s.expiresAt,
              }).catch(err => {
                // Ignore duplicate key errors
                if (err.code !== 11000) throw err;
              })
            )
          );

          // Demote old primary → promote new device
          await Device.findByIdAndUpdate(existingPrimary._id, {
            isPrimary: false,
          });

          await Device.findOneAndUpdate(
            { deviceId: device.deviceId },
            { userId: user._id, isPrimary: true, ...device },
            { upsert: true, new: true }
          );

        } else if (!existingPrimary) {
          // No primary at all — set this device as primary
          await Device.findOneAndUpdate(
            { deviceId: device.deviceId },
            { userId: user._id, isPrimary: true, ...device },
            { upsert: true, new: true }
          );
        }
        // else: same device logging in again — no device changes
      }

      // 3️⃣ Revoke previous sessions for THIS device
      await Session.updateMany(
        { userId: user._id, deviceId: device.deviceId, revoked: false },
        { revoked: true }
      );

      // 4️⃣ Generate refresh token
      const refreshToken = jwtService.generateRefreshToken({
        userId: user._id.toString(),
        deviceId: device.deviceId,
        type: "refresh",
      });

      const refreshTokenHash = jwtService.hashRefreshToken(refreshToken);

      // 5️⃣ Create new session — matching your schema exactly
      await Session.create({
        userId: user._id,
        deviceId: device.deviceId,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        revoked: false,
        refreshTokenVersion: 0,
        lastUsedAt: new Date(),
      });

      // 6️⃣ Generate access token
      const accessToken = jwtService.generateAccessToken({
        userId: user._id.toString(),
        deviceId: device.deviceId,
        type: "access",
      });

      res.json({ user, accessToken, refreshToken });

    } catch (error: any) {
      console.error("verifyOTP error:", error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  }
  // async verifyOTP(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { phoneNumber, otp, device, countryISO, countryCode } = req.body;

  //     if (!phoneNumber || !otp || !device?.deviceId) {
  //       res.status(400).json({ message: "Invalid request" });
  //       return;
  //     }

  //     // 1️⃣ Verify OTP with Twilio
  //     // const verification = await TwilioService.verifyCode(phoneNumber, otp);

  //     // if (!verification.success) {
  //     //   res.status(401).json({ message: "Invalid OTP" });
  //     //   return;
  //     // }

  //     // 2️⃣ Create or fetch user
  //     let user = await User.findOne({ phoneNumber }).select("_id displayName about phoneNumber").populate("profilePicture", "secureUrl");
  //     let userDevice = await Device.findById(device.deviceId)

  //     if (!user) {
  //       user = await User.create({
  //         phoneNumber,
  //         countryISO,
  //         countryCode,
  //         displayName: device.deviceName,
  //         isPhoneVerified: true
  //       });

  //       userDevice = await Device.create({
  //         userId: user._id,
  //         isPrimary: true,
  //         ...device
  //       })
  //     }


  //     // 4️⃣ Create refresh token

  //     const refreshToken = jwtService.generateRefreshToken({
  //       userId: user._id.toString(),
  //       deviceId: device.deviceId,
  //       type: "refresh"
  //     });

  //     const refreshTokenHash = jwtService.hashRefreshToken(refreshToken);

  //     // 5️⃣ Save session
  //     await Session.create({
  //       userId: user._id,
  //       deviceId: device.deviceId,
  //       refreshTokenHash,
  //       expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  //       ip: req.ip,
  //       userAgent: req.headers["user-agent"]
  //     });

  //     // 6️⃣ Create access token
  //     const accessToken = jwtService.generateAccessToken({
  //       userId: user._id.toString(),
  //       deviceId: device.deviceId,
  //       type: "access"
  //     });

  //     res.json({
  //       user,
  //       accessToken,
  //       refreshToken
  //     });
  //     return;
  //   }
  //   catch (error: any) {
  //     console.error('Resend OTP error:', error);
  //     res.status(500).json({ error: 'Failed to resend verification code' });
  //   }
  // };

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
  }

}

export default new AuthController();