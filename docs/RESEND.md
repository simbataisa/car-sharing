# Resend API Setup Guide

## Overview

This guide provides comprehensive instructions for setting up and configuring Resend API for the Car Sharing Application's email verification system. Resend is used to send OTP verification emails and welcome emails when admin/telesales personnel create customer accounts.

## Table of Contents

1. [What is Resend?](#what-is-resend)
2. [Account Setup](#account-setup)
3. [Domain Configuration](#domain-configuration)
4. [API Key Generation](#api-key-generation)
5. [Environment Configuration](#environment-configuration)
6. [Email Templates](#email-templates)
7. [Testing Configuration](#testing-configuration)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)
10. [Security Best Practices](#security-best-practices)

## What is Resend?

[Resend](https://resend.com) is a modern email delivery service designed for developers. It provides:

- **High Deliverability**: Optimized for inbox placement
- **Developer-Friendly API**: Simple, RESTful email sending
- **Domain Authentication**: SPF, DKIM, and DMARC setup
- **Real-time Analytics**: Email delivery tracking and metrics
- **Template Support**: HTML and text email templates
- **Reliable Infrastructure**: Built for scale and reliability

### Why Resend for This Project?

- **OTP Email Delivery**: Secure, fast delivery of verification codes
- **Professional Templates**: Branded email templates for better user experience
- **Easy Integration**: Simple API with excellent TypeScript support
- **Cost Effective**: Free tier available for development and testing
- **Excellent Deliverability**: High inbox placement rates

## Account Setup

### Step 1: Create Resend Account

1. Visit [resend.com](https://resend.com)
2. Click **"Sign Up"** to create a new account
3. Choose your preferred signup method:
   - Email and password
   - GitHub account
   - Google account
4. Verify your email address if required
5. Complete the onboarding process

### Step 2: Account Verification

- Verify your email address through the confirmation email
- Complete any required account verification steps
- Access the Resend dashboard

## Domain Configuration

### Overview

Domain configuration is crucial for email deliverability and branding. You need to add and verify your sending domain.

### Step 1: Add Your Domain

1. **Navigate to Domains**:

   - Log into the Resend dashboard
   - Click on **"Domains"** in the left sidebar
   - Click **"Add Domain"**

2. **Enter Domain Information**:
   - Enter your domain (e.g., `yourdomain.com`)
   - Choose the region closest to your users
   - Click **"Add Domain"**

### Step 2: DNS Configuration

After adding your domain, you'll need to configure DNS records:

#### SPF Record

```dns
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

#### DKIM Record

```dns
Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.resend.com
```

#### DMARC Record (Optional but Recommended)

```dns
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

### Step 3: Domain Verification

1. **Add DNS Records**: Configure the records with your DNS provider
2. **Verify Domain**: Click **"Verify Domain"** in the Resend dashboard
3. **Wait for Propagation**: DNS changes can take up to 24 hours
4. **Check Status**: Domain status should show as "Verified"

### DNS Providers Examples

#### Cloudflare

1. Log into Cloudflare dashboard
2. Select your domain
3. Go to **DNS** > **Records**
4. Add the required TXT and CNAME records

#### GoDaddy

1. Log into GoDaddy account
2. Go to **My Products** > **DNS**
3. Select your domain
4. Add the required DNS records

#### Namecheap

1. Log into Namecheap account
2. Go to **Domain List**
3. Click **"Manage"** next to your domain
4. Go to **Advanced DNS** tab
5. Add the required records

## API Key Generation

### Step 1: Generate API Key

1. **Navigate to API Keys**:

   - In the Resend dashboard, click **"API Keys"**
   - Click **"Create API Key"**

2. **Configure API Key**:

   - **Name**: Enter a descriptive name (e.g., "Car Sharing App - Production")
   - **Permission**: Choose appropriate permissions
     - **Full Access**: Complete email sending capabilities (recommended for production)
     - **Sending Access**: Email sending only (good for application use)
   - **Domain**: Select your verified domain

3. **Generate and Store**:
   - Click **"Create"**
   - **IMPORTANT**: Copy the API key immediately
   - Store it securely (you won't be able to see it again)

### Step 2: API Key Security

- **Never commit API keys to version control**
- Store in environment variables only
- Use different keys for development and production
- Rotate keys regularly for security

## Environment Configuration

### Step 1: Update Environment Variables

Add the following variables to your `.env.local` file:

```env
# Email Configuration (Resend)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Step 2: Environment Variable Details

#### RESEND_API_KEY

- Your Resend API key from the dashboard
- Format: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Keep this secret and secure

#### RESEND_FROM_EMAIL

- The email address used as the sender
- Must be from your verified domain
- Examples:
  - `noreply@yourdomain.com`
  - `support@yourdomain.com`
  - `notifications@yourdomain.com`

### Step 3: Development vs Production

#### Development Setup

```env
# Development
RESEND_API_KEY=re_dev_key_here
RESEND_FROM_EMAIL=noreply@test.yourdomain.com
```

#### Production Setup

```env
# Production
RESEND_API_KEY=re_prod_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

## Email Templates

The application includes two main email templates:

### OTP Verification Email

**Purpose**: Send 6-digit verification codes to customers

**Template Features**:

- Professional branding with company logo
- Clear, prominent OTP display
- Security messaging about code expiration
- Responsive HTML design
- Fallback text version

**Customization**:

- Edit `/lib/email.ts` file
- Modify the `generateOTPEmailTemplate()` function
- Update branding, colors, and messaging

### Welcome Email

**Purpose**: Welcome new customers with login credentials

**Template Features**:

- Welcome message with temporary password
- Login instructions and security recommendations
- Professional styling consistent with brand
- Clear call-to-action buttons
- Contact information for support

**Customization**:

- Edit `/lib/email.ts` file
- Modify the `generateWelcomeEmailTemplate()` function
- Update company information and branding

### Template Customization Example

```typescript
// In /lib/email.ts
const generateOTPEmailTemplate = (otp: string, userName?: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify Your Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
      <!-- Your custom template here -->
      <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h1 style="color: #333; text-align: center;">Your Company Name</h1>
        <h2 style="color: #333; text-align: center;">Email Verification</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; text-align: center; color: #007bff; margin: 20px 0;">${otp}</div>
        <!-- Add more customization -->
      </div>
    </body>
    </html>
  `;
};
```

## Testing Configuration

### Step 1: Verify Installation

Check that Resend is properly installed:

```bash
npm list resend
# Should show: resend@6.0.1
```

### Step 2: Test API Connection

Create a test file to verify your configuration:

```javascript
// test-email.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: ["test@example.com"],
      subject: "Test Email",
      html: "<p>This is a test email from Resend!</p>",
    });

    if (error) {
      console.error("Error:", error);
    } else {
      console.log("Success:", data);
    }
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

testEmail();
```

### Step 3: Test in Application

1. **Start Development Server**:

   ```bash
   npm run dev
   ```

2. **Test Email Verification**:

   - Navigate to admin bookings: `http://localhost:3000/admin/bookings`
   - Click **"Create Booking"**
   - Click **"Create New Customer"**
   - Enter a test email address
   - Check if OTP email is sent successfully

3. **Check Email Delivery**:
   - Check your inbox (and spam folder)
   - Verify the email appears professional
   - Test the OTP verification process

## Production Deployment

### Step 1: Domain Verification

**Before production deployment**:

- Ensure your production domain is verified in Resend
- Test email delivery from production domain
- Verify DNS records are properly configured

### Step 2: Environment Variables

**Set production environment variables**:

```bash
# For Vercel
vercel env add RESEND_API_KEY
vercel env add RESEND_FROM_EMAIL

# For other platforms
export RESEND_API_KEY=re_your_production_key
export RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Step 3: Email Limits and Quotas

**Resend Free Tier**:

- 3,000 emails per month
- 100 emails per day

**Paid Plans**:

- Higher sending limits
- Priority support
- Advanced analytics

### Step 4: Monitoring

**Set up monitoring for**:

- Email delivery rates
- Bounce rates
- API errors
- Queue health

## Troubleshooting

### Common Issues

#### 1. "Invalid API Key" Error

**Symptoms**: API returns authentication error
**Solutions**:

- Verify API key is correct in `.env.local`
- Check for extra spaces or characters
- Regenerate API key if necessary
- Ensure API key has proper permissions

#### 2. "Domain Not Verified" Error

**Symptoms**: Emails fail with domain verification error
**Solutions**:

- Check domain verification status in Resend dashboard
- Verify DNS records are properly configured
- Wait for DNS propagation (up to 24 hours)
- Use `dig` or `nslookup` to verify DNS records

#### 3. Emails Going to Spam

**Symptoms**: OTP emails land in spam folder
**Solutions**:

- Verify SPF, DKIM, and DMARC records
- Use professional email templates
- Avoid spam trigger words
- Implement proper authentication

#### 4. Rate Limiting Issues

**Symptoms**: API returns rate limit errors
**Solutions**:

- Check current usage in Resend dashboard
- Implement retry logic with exponential backoff
- Upgrade to higher tier plan if needed
- Space out email sending

### Debugging Steps

#### 1. Check Environment Variables

```bash
# Verify environment variables are loaded
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');
console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL);
```

#### 2. Test API Connection

```javascript
// Simple API test
const resend = new Resend(process.env.RESEND_API_KEY);
console.log("Resend client created:", !!resend);
```

#### 3. Check Email Service

```javascript
// Test email service function
import { sendOTPEmail } from "@/lib/email";

try {
  const result = await sendOTPEmail({
    email: "test@example.com",
    otp: "123456",
  });
  console.log("Email sent:", result);
} catch (error) {
  console.error("Email failed:", error);
}
```

### Error Codes

| Error Code            | Description                   | Solution                     |
| --------------------- | ----------------------------- | ---------------------------- |
| `invalid_api_key`     | API key is invalid or missing | Check API key configuration  |
| `domain_not_verified` | Sending domain not verified   | Complete domain verification |
| `rate_limit_exceeded` | Too many requests             | Implement rate limiting      |
| `invalid_email`       | Email address format invalid  | Validate email addresses     |
| `template_error`      | Email template has issues     | Check HTML template syntax   |

## Security Best Practices

### API Key Security

1. **Never Expose API Keys**:

   - Keep API keys in environment variables only
   - Never commit to version control
   - Use different keys for different environments

2. **Key Rotation**:

   - Rotate API keys regularly
   - Monitor key usage in dashboard
   - Revoke unused or compromised keys

3. **Access Control**:
   - Use minimum required permissions
   - Create separate keys for different applications
   - Monitor API key usage and access patterns

### Email Security

1. **Input Validation**:

   - Validate all email addresses
   - Sanitize email content
   - Prevent email injection attacks

2. **Rate Limiting**:

   - Implement application-level rate limiting
   - Monitor for unusual sending patterns
   - Set up alerts for high usage

3. **Content Security**:
   - Use secure email templates
   - Avoid including sensitive data in emails
   - Implement proper error handling

### Domain Security

1. **DNS Security**:

   - Use strong DNS provider
   - Enable DNS security features
   - Monitor DNS changes

2. **Email Authentication**:
   - Implement SPF, DKIM, and DMARC
   - Monitor authentication reports
   - Keep DNS records up to date

## Support and Resources

### Official Documentation

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Resend Node.js SDK](https://resend.com/docs/sdk/node)

### Community Resources

- [Resend GitHub](https://github.com/resendlabs/resend-node)
- [Resend Discord Community](https://resend.com/discord)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/resend)

### Contact Support

- **Email**: support@resend.com
- **Documentation**: Comprehensive guides and tutorials
- **Status Page**: [resend.status.io](https://resend.status.io)

### Application-Specific Help

For issues specific to this Car Sharing Application:

1. **Email Service Issues**: Check `/lib/email.ts` implementation
2. **API Endpoint Problems**: Review `/app/api/admin/email/` endpoints
3. **Frontend Integration**: Examine modal workflow in `/app/admin/bookings/page.tsx`
4. **Database Issues**: Check EmailVerification model in Prisma schema

---

## Quick Start Checklist

- [ ] Create Resend account
- [ ] Add and verify domain
- [ ] Configure DNS records (SPF, DKIM, DMARC)
- [ ] Generate API key
- [ ] Update `.env.local` with API key and from email
- [ ] Test email sending in development
- [ ] Verify OTP email template
- [ ] Test welcome email template
- [ ] Monitor email deliverability
- [ ] Set up production environment variables

Once you complete this checklist, the email verification system will be fully operational, enabling admin and telesales personnel to create customer accounts with professional email verification.
