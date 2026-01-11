// src/services/twilio.service.ts
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

class TwilioService {

  private client: twilio.Twilio;
  private verifyServiceSid: string;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
    this.verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;
  }

  // Method 1: Using Twilio Verify API (Recommended - easier)
  async sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; sid?: string; error?: string }> {
    try {
      const verification = await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verifications.create({
          to: phoneNumber,
          channel: 'sms'
        });

      console.log('OTP sent via Twilio Verify:', verification.sid);

      return {
        success: true,
        sid: verification.sid
      };
    } catch (error: any) {
      console.error('Twilio Verify error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async verifyCode(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const verificationCheck = await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks.create({
          to: phoneNumber,
          code: code
        });

      if (verificationCheck.status === 'approved') {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: 'Invalid verification code' 
        };
      }
    } catch (error: any) {
      console.error('Twilio verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Method 2: Manual OTP sending (more control)
  async sendOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; sid?: string; error?: string }> {
    try {
      const message = await this.client.messages.create({
        body: `Your verification code is: ${otp}. Valid for ${process.env.OTP_EXPIRY_MINUTES} minutes. Never share this code.`,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: phoneNumber
      });

      console.log('OTP sent via Twilio SMS:', message.sid);

      return {
        success: true,
        sid: message.sid
      };
    } catch (error: any) {
      console.error('Twilio SMS error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new TwilioService();