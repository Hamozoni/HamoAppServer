// src/services/otp.service.ts
import OTP from '../models/otp.model.js';
import  twilioService from './twilio.services.js';
import dotenv from 'dotenv';
dotenv.config();

class OTPService {
  
  // Generate 6-digit OTP
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP to phone number
  async sendOTP(phoneNumber: string): Promise<{ success: boolean; expiresIn?: number; error?: string }> {
    try {
      // Delete any existing OTPs for this phone number
      await OTP.deleteMany({ phoneNumber, verified: false });

      // Generate OTP
      const otp = this.generateOTP();
      const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      // Save OTP to database
      await OTP.create({
        phoneNumber,
        otp,
        expiresAt,
        attempts: 0,
        verified: false
      });

      // Send OTP via Twilio
      const result = await twilioService.sendOTP(phoneNumber, otp);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      return {
        success: true,
        expiresIn: expiryMinutes * 60 // in seconds
      };
    } catch (error: any) {
      console.error('Send OTP error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verify OTP
  async verifyOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Find OTP record
      const otpRecord = await OTP.findOne({
        phoneNumber,
        verified: false
      }).sort({ createdAt: -1 });

      if (!otpRecord) {
        return {
          success: false,
          error: 'OTP not found or already verified'
        };
      }

      // Check if expired
      if (otpRecord.expiresAt < new Date()) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return {
          success: false,
          error: 'OTP has expired'
        };
      }

      // Check max attempts
      const maxAttempts = parseInt(process.env.MAX_OTP_ATTEMPTS || '3');
      if (otpRecord.attempts >= maxAttempts) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return {
          success: false,
          error: 'Maximum verification attempts exceeded'
        };
      }

      // Verify OTP
      if (otpRecord.otp !== otp) {
        // Increment attempts
        otpRecord.attempts += 1;
        await otpRecord.save();

        return {
          success: false,
          error: `Invalid OTP. ${maxAttempts - otpRecord.attempts} attempts remaining`
        };
      }

      // Mark as verified
      otpRecord.verified = true;
      await otpRecord.save();

      // Clean up - delete the OTP record after successful verification
      setTimeout(() => {
        OTP.deleteOne({ _id: otpRecord._id }).catch(console.error);
      }, 5000); // Delete after 5 seconds

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Resend OTP (with rate limiting)
  async resendOTP(phoneNumber: string): Promise<{ success: boolean; expiresIn?: number; error?: string }> {
    try {
      // Check if there's a recent OTP (less than 1 minute old)
      const recentOTP = await OTP.findOne({
        phoneNumber,
        createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
      });

      if (recentOTP) {
        return {
          success: false,
          error: 'Please wait 1 minute before requesting a new OTP'
        };
      }

      // Send new OTP
      return await this.sendOTP(phoneNumber);
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new OTPService();