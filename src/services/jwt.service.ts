// src/services/jwt.service.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';


export interface IJWTPayload {
  userId: string;
  deviceId: string;
  type: 'access' | 'refresh';
}
class JWTService {

  // Generate access token
  generateAccessToken(payload: IJWTPayload): string {
    return jwt.sign(
      { ...payload, type: 'access' },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '15m' }
    );
  }

  // Generate refresh token
  generateRefreshToken(payload: IJWTPayload): string {

    const refreshToken = jwt.sign(
      {
        userId: payload.userId,
        deviceId: payload.deviceId,
        type: payload.type || "refresh"
      },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: "30d" }
    );
    return refreshToken
  }

  hashRefreshToken(token: string): string {
    return crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
  }
  // Verify access token
  verifyAccessToken(token: string): IJWTPayload {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as IJWTPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      }
      throw new Error('Invalid access token');
    }
  };

  // Verify refresh token
  verifyRefreshToken(token: string): IJWTPayload {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as IJWTPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      throw new Error('Invalid refresh token');
    }
  }

  // Decode token without verification
  decodeToken(token: string): IJWTPayload | null {
    return jwt.decode(token) as IJWTPayload | null;
  }
}

export default new JWTService();