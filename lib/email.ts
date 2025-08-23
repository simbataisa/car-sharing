import { Resend } from "resend";

// Initialize Resend with fallback for development
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Helper to check if email service is available and properly configured
const isEmailServiceAvailable = (): boolean => {
  const hasApiKey = !!resend && !!process.env.RESEND_API_KEY;
  const hasValidFromEmail =
    !!process.env.RESEND_FROM_EMAIL &&
    !process.env.RESEND_FROM_EMAIL.includes("yourdomain.com");

  return hasApiKey && hasValidFromEmail;
};

// Helper to check if we should attempt to send emails
const shouldAttemptEmailSend = (): boolean => {
  return !!resend && !!process.env.RESEND_API_KEY;
};

export interface SendOTPEmailParams {
  email: string;
  otp: string;
  userName?: string;
}

export interface SendWelcomeEmailParams {
  email: string;
  userName: string;
  temporaryPassword: string;
}

export interface SendActivationEmailParams {
  email: string;
  userName: string;
  activationToken: string;
}

export const sendOTPEmail = async ({
  email,
  otp,
  userName,
}: SendOTPEmailParams) => {
  try {
    if (!isEmailServiceAvailable()) {
      console.warn(
        "Email service not configured. OTP email not sent to:",
        email
      );
      console.log("OTP for development:", otp);
      return {
        success: true,
        data: {
          message: "Email service not configured - check console for OTP",
        },
      };
    }

    const { data, error } = await resend!.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "CarShare <noreply@carshare.com>",
      to: [email],
      subject: "Verify your email address - CarShare",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🚗 CarShare</h1>
              <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Your trusted car sharing platform</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 40px 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <h2 style="color: #2c3e50; margin-top: 0; font-size: 24px;">Email Verification Required</h2>
              
              ${
                userName
                  ? `<p style="font-size: 16px; margin-bottom: 20px;">Hello ${userName},</p>`
                  : ""
              }
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Your email verification code is:
              </p>
              
              <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                  ${otp}
                </span>
              </div>
              
              <p style="font-size: 14px; color: #6c757d; margin-bottom: 20px;">
                <strong>This code will expire in 10 minutes.</strong>
              </p>
              
              <p style="font-size: 14px; color: #6c757d;">
                If you didn't request this verification, please ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #adb5bd; text-align: center; margin: 0;">
                This email was sent by CarShare Admin on behalf of the platform.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending OTP email:", error);
      throw new Error("Failed to send verification email");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in sendOTPEmail:", error);
    throw error;
  }
};

export const sendActivationEmail = async ({
  email,
  userName,
  activationToken,
}: SendActivationEmailParams) => {
  try {
    const activationUrl = `${
      process.env.NEXTAUTH_URL || "http://localhost:3000"
    }/activate?token=${activationToken}`;

    if (!isEmailServiceAvailable()) {
      console.warn(
        "Email service not configured. Activation email not sent to:",
        email
      );
      console.log("Activation URL for development:", activationUrl);
      return {
        success: true,
        data: {
          message:
            "Email service not configured - check console for activation URL",
        },
      };
    }

    const { data, error } = await resend!.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "CarShare <noreply@carshare.com>",
      to: [email],
      subject: "Activate Your CarShare Account",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Account Activation</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🚗 Welcome to CarShare</h1>
              <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Activate your account to get started</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 40px 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <h2 style="color: #2c3e50; margin-top: 0; font-size: 24px;">Account Activation Required</h2>
              
              <p style="font-size: 16px; margin-bottom: 20px;">Hello ${userName},</p>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Your CarShare account has been created by our admin team. To complete the setup and access your account, please click the activation button below:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${activationUrl}" 
                   style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                  Activate My Account
                </a>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  <strong>⚠️ Important:</strong> This activation link will expire in 24 hours. If you don't activate your account within this time, please contact our support team.
                </p>
              </div>
              
              <p style="font-size: 14px; color: #6c757d; margin-bottom: 20px;">
                If the button above doesn't work, you can copy and paste this link into your browser:
              </p>
              
              <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 10px; margin: 15px 0; word-break: break-all;">
                <code style="font-size: 12px; color: #495057;">${activationUrl}</code>
              </div>
              
              <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
                After activation, you'll be able to:
              </p>
              <ul style="font-size: 14px; color: #6c757d; padding-left: 20px;">
                <li>Browse and book available vehicles</li>
                <li>Manage your bookings and profile</li>
                <li>Access exclusive member benefits</li>
              </ul>
              
              <p style="font-size: 14px; color: #6c757d;">
                If you didn't expect this email or have any questions, please contact our support team.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #adb5bd; text-align: center; margin: 0;">
                This account was created by CarShare Admin team.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending activation email:", error);
      throw new Error("Failed to send activation email");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in sendActivationEmail:", error);
    throw error;
  }
};

export const sendWelcomeEmail = async ({
  email,
  userName,
  temporaryPassword,
}: SendWelcomeEmailParams) => {
  try {
    if (!isEmailServiceAvailable()) {
      console.warn(
        "Email service not configured. Welcome email not sent to:",
        email
      );
      console.log("Temporary password for development:", temporaryPassword);
      return {
        success: true,
        data: {
          message:
            "Email service not configured - check console for credentials",
        },
      };
    }

    const { data, error } = await resend!.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "CarShare <noreply@carshare.com>",
      to: [email],
      subject: "Welcome to CarShare - Account Created",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to CarShare</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🚗 Welcome to CarShare</h1>
              <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Your account has been created!</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 40px 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <h2 style="color: #2c3e50; margin-top: 0; font-size: 24px;">Account Details</h2>
              
              <p style="font-size: 16px; margin-bottom: 20px;">Hello ${userName},</p>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Your CarShare account has been successfully created by our admin team. Here are your login details:
              </p>
              
              <div style="background: white; border-radius: 8px; padding: 25px; margin: 30px 0; border: 1px solid #e9ecef;">
                <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 0;"><strong>Temporary Password:</strong> 
                  <span style="font-family: 'Courier New', monospace; background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                    ${temporaryPassword}
                  </span>
                </p>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${
                  process.env.NEXTAUTH_URL || "http://localhost:3000"
                }/login" 
                   style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Login to CarShare
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6c757d;">
                If you have any questions, please contact our support team.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #adb5bd; text-align: center; margin: 0;">
                This account was created by CarShare Admin team.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending welcome email:", error);
      throw new Error("Failed to send welcome email");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in sendWelcomeEmail:", error);
    throw error;
  }
};

export const generateOTP = (): string => {
  return Math.random().toString().slice(2, 8).padStart(6, "0");
};

// Activation token utilities
export const generateActivationToken = (): string => {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
};

export const generateActivationTokenExpiry = (): Date => {
  // Token expires in 24 hours
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
};

export const validateActivationToken = (token: string): boolean => {
  // Basic validation - token should be 64 character hex string
  return /^[a-f0-9]{64}$/.test(token);
};
