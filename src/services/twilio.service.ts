// src/services/twilio.service.ts
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

export interface IVerificationCheck {
  success: boolean;
  sid?: string;
  error?: string;
  status?: string;
  expiresIn?: number;
}

class TwilioService {
  private client: twilio.Twilio;
  private verifyServiceSid: string;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_TOKEN!
    );
    this.verifyServiceSid = process.env.TWILIO_SERVICES_TOKEN!;
  }

  /**
   * Send verification code via Twilio Verify
   * Twilio handles OTP generation, storage, and expiry automatically
   */
  async sendVerificationCode(
    phoneNumber: string,
  ): Promise<IVerificationCheck> {
    try {
      const verification = await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verifications
        .create({
          to: phoneNumber,
          channel: 'sms',
          locale: 'ar'
        });
      return {
        success: true,
        sid: verification.sid,
        status: verification.status
      };
    } catch (error: any) {

      // Handle specific Twilio errors
      if (error.code === 60200) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      } else if (error.code === 60203) {
        return {
          success: false,
          error: 'Maximum send attempts reached. Please try again later.'
        };
      } else if (error.code === 60212) {
        return {
          success: false,
          error: 'Too many requests. Please wait before trying again.'
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to send verification code'
      };
    }
  }

  /**
   * Verify the code entered by user
   */
  async verifyCode(
    phoneNumber: string,
    code: string
  ): Promise<IVerificationCheck> {
    try {
      const verificationCheck = await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks
        .create({
          to: phoneNumber,
          code: code
        });

      if (verificationCheck.status === 'approved') {
        return {
          success: true,
          status: 'approved'
        };
      } else {
        return {
          success: false,
          error: 'Invalid or expired verification code',
          status: verificationCheck.status
        };
      }
    } catch (error: any) {

      // Handle specific errors
      if (error.code === 60200) {
        return {
          success: false,
          error: 'Invalid phone number'
        };
      } else if (error.code === 60202) {
        return {
          success: false,
          error: 'Maximum check attempts reached'
        };
      } else if (error.code === 60223) {
        return {
          success: false,
          error: 'No verification found or code expired'
        };
      }

      return {
        success: false,
        error: error.message || 'Verification failed'
      };
    }
  }

  /**
   * Cancel a pending verification
   */
  async cancelVerification(
    sid: string
  ): Promise<IVerificationCheck> {
    try {
      await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verifications(sid)
        .update({ status: 'canceled' });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check verification status
   */
  async checkVerificationStatus(
    sid: string
  ): Promise<IVerificationCheck> {
    try {
      const verification = await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verifications(sid)
        .fetch();

      return {
        success: true,
        status: verification.status
      };
    } catch (error: any) {
      console.error('❌ Check status error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new TwilioService();