// src/services/jwt.service.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';


export interface IJWTPayload {
  userId: string;
  deviceId: string;
  type: 'access' | 'refresh';
}
class JWTService {

  private accessTokenSecret = process.env.JWT_ACCESS_SECRET || "access-secret";
  private refreshTokenSecret = process.env.JWT_REFRESH_SECRET || "refresh-secret";
  private accessTokenTTL = 15 * 60; // 15 minutes in seconds
  private refreshTokenTTL = 30 * 24 * 60 * 60; // 30 days in seconds

  // Generate access token
  generateAccessToken(payload: IJWTPayload): string {
    return jwt.sign(payload, this.accessTokenSecret, { expiresIn: this.accessTokenTTL });
  }

  // Generate refresh token
  generateRefreshToken(payload: IJWTPayload): string {

    const refreshToken = jwt.sign(payload,
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenTTL }
    );
    return refreshToken
  }

  hashRefreshToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
  // Verify access token
  verifyAccessToken(token: string): IJWTPayload {
    return jwt.verify(token, this.accessTokenSecret) as IJWTPayload;
  };

  // Verify refresh token
  verifyRefreshToken(token: string): IJWTPayload {
    return jwt.verify(token, this.refreshTokenSecret) as IJWTPayload;
  }

  // Decode token without verification
  decodeToken(token: string): IJWTPayload | null {
    return jwt.decode(token) as IJWTPayload | null;
  }
}

export default new JWTService();