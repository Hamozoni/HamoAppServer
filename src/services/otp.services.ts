// src/services/otp.service.ts
import twilioService from './twilio.services.js';

class OTPService {
  
  /**
   * Send OTP via Twilio Verify
   * Twilio handles: generation, storage, expiry, rate limiting
   */
  async sendOTP(
    phoneNumber: string,
    channel: 'sms' | 'call' = 'sms'
  ): Promise<{ 
    success?: boolean; 
    expiresIn?: number; 
    error?: string;
    sid?: string;
  }> {
    try {
      const result = await twilioService.sendVerificationCode(phoneNumber, channel);

      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      return {
        success: true,
        expiresIn: 600, // Twilio Verify: 10 minutes default
        sid: result.sid
      };
    } catch (error: any) {
      console.error('Send OTP error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send OTP'
      };
    }
  }

  /**
   * Verify OTP via Twilio Verify
   */
  async verifyOTP(
    phoneNumber: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await twilioService.verifyCode(phoneNumber, code);

      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      return {
        success: false,
        error: error.message || 'Verification failed'
      };
    }
  }

  /**
   * Resend OTP (Twilio Verify handles rate limiting)
   */
  async resendOTP(
    phoneNumber: string,
    channel: 'sms' | 'call' = 'sms'
  ): Promise<{ 
    success: boolean; 
    expiresIn?: number; 
    error?: string;
  }> {
    try {
      // Just send a new verification
      // Twilio Verify automatically invalidates the old one
      return await this.sendOTP(phoneNumber, channel);
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new OTPService();