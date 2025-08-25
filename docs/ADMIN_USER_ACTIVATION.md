# Admin User Creation with Email Activation

## Overview

The admin portal provides a comprehensive email activation link system for creating user accounts with enhanced management capabilities. This ensures that:

1. Users receive proper notification about their account creation
2. Email addresses are validated through user action
3. Users set their own secure passwords during activation
4. The process is asynchronous and doesn't require admin intervention
5. Users have full control over their account security from the start
6. **Admins can manage and resend activation emails as needed**

## Enhanced Features

### Email Verification Management

- **Visual Status Indicators**: Clear display of email verification status in admin interface with color-coded badges:
  - ✅ **Verified**: Green badge with checkmark icon for successfully activated accounts
  - ⚠️ **Pending**: Yellow badge with alert icon for users awaiting activation
  - ❌ **Failed**: Red badge with X icon for failed or expired activation attempts
- **Advanced Resend Capability**: One-click resend for users with PENDING_EMAIL_VERIFICATION status:
  - Envelope icon button for intuitive user interaction
  - Real-time loading states during resend operation
  - Immediate success/error feedback with auto-clearing messages
  - Generates new secure activation token with 24-hour expiry
- **Real-time Feedback**: Enhanced user experience with loading states and success/error messages:
  - Auto-clearing messages after 5 seconds for clean interface
  - Immediate visual feedback for all admin actions
  - Professional error handling with clear explanations
- **Enhanced UX**: Professional email templates with consistent CarShare branding:
  - Responsive HTML design for all devices
  - Clear call-to-action buttons and alternative links
  - Security messaging about 24-hour expiration
- **Comprehensive Status Tracking**: Full lifecycle management of user activation process:
  - Status updates in real-time without page refresh
  - Historical tracking of activation attempts
  - Administrative oversight of pending activations

## Workflow

### 1. Admin Creates User Account

- Admin enters the user's email address, full name, and selects a role
- System validates the email format and checks for existing users
- User account is created with `PENDING_EMAIL_VERIFICATION` status
- Account is initially inactive until email verification

### 2. Activation Email Sent

- System generates a secure 64-character activation token
- Activation email with branded template is sent to the user
- Token expires in 24 hours for security
- Email includes clear instructions and direct activation link

### 3. User Account Activation

- User clicks the activation link in their email
- System validates the token and checks expiration
- User sets their own secure password
- Account status changes to `VERIFIED` and becomes active
- Welcome confirmation email is sent

## API Endpoints

### Create User with Activation

```
POST /api/admin/users
Body: {
  "email": "user@example.com",
  "name": "User Name",
  "role": "USER"
}
Response: {
  "user": { ... },
  "message": "User created successfully. Activation email has been sent.",
  "activationRequired": true
}
```

### Validate Activation Token

```
GET /api/auth/activate?token=xxx
Response: {
  "valid": true,
  "user": { "email": "...", "name": "..." },
  "expiresAt": "2024-01-01T00:00:00Z"
}
```

### Activate Account

```
POST /api/auth/activate
Body: {
  "token": "activation_token",
  "password": "user_password",
  "confirmPassword": "user_password"
}
Response: {
  "message": "Account activated successfully!",
  "user": { ... },
  "redirectTo": "/login"
}
```

### Resend Activation Email

```
POST /api/admin/users/[id]/resend-verification
Response: {
  "message": "Verification email has been resent successfully",
  "user": { "id": "...", "email": "...", "name": "..." },
  "instructions": {
    "userNotification": "A new activation link has been sent to the user's email",
    "nextSteps": "User must click the activation link within 24 hours to complete account setup",
    "activationExpires": "24 hours"
  }
}
```

**Features:**

- Validates user exists and has PENDING_EMAIL_VERIFICATION status
- Generates new secure 64-character activation token
- Updates token expiration to 24 hours from current time
- Sends professional branded activation email
- Returns comprehensive response with user instructions

## Database Schema Changes

### User Model Updates

- `emailVerified`: Boolean flag for email verification status
- `emailVerificationStatus`: Enum (`VERIFIED`, `PENDING_EMAIL_VERIFICATION`)
- `activationToken`: Secure token for account activation (nullable)
- `activationTokenExpires`: Token expiration timestamp (nullable)
- `password`: Now nullable until account activation

### Email Verification Status Enum

```sql
enum EmailVerificationStatus {
  VERIFIED
  PENDING_EMAIL_VERIFICATION
}
```

## Security Features

- **Secure Token Generation**: 64-character hex tokens using crypto.randomBytes
- **Time-Limited Activation**: Tokens expire in 24 hours
- **User-Controlled Passwords**: Users set their own passwords during activation
- **Account State Management**: Accounts inactive until email verification
- **Admin Authentication**: All endpoints protected by admin middleware
- **Input Validation**: Comprehensive validation for all user inputs

## User Experience

### For Admin Users:

1. **Simple Form**: Clean interface with email, name, and role selection
2. **Clear Messaging**: Informative notices about activation process with professional feedback
3. **Enhanced Status Management**: Comprehensive email verification status tracking:
   - Visual status indicators with color-coded badges for quick identification
   - Resend activation emails for users with pending verification status
   - Real-time status updates without requiring page refresh
4. **Advanced Resend Functionality**: Streamlined resend process for better user management:
   - One-click resend button with envelope icon for intuitive interaction
   - Loading states during resend operation with spinner feedback
   - Immediate success confirmation with auto-clearing messages (5-second timeout)
   - Professional error handling with clear explanations for failed operations
5. **Immediate Feedback**: Success confirmation with clear next steps and professional messaging
6. **No Waiting**: Asynchronous process doesn't block admin workflow or require coordination
7. **Professional Interface**: Modern, accessible design with keyboard navigation support

### For New Users:

1. **Professional Email**: Branded activation email with clear instructions
2. **Secure Activation**: Users set their own passwords
3. **24-Hour Window**: Reasonable time limit for activation
4. **Clear Instructions**: Step-by-step guidance through activation
5. **Immediate Access**: Can login immediately after activation

## Email Templates

### Activation Email

- Branded CarShare header with gradient design
- Clear call-to-action button for activation
- 24-hour expiration notice
- Alternative link for manual copy-paste
- Professional footer with support information

### Welcome Email (Post-Activation)

- Congratulatory message for successful activation
- Login instructions and next steps
- Feature overview for new users
- Support contact information

## Advantages Over OTP Approach

### For Admin-Created Users:

1. **Asynchronous Process**: Admin doesn't need to wait for user input
2. **User Autonomy**: Users control their own password security
3. **Better UX**: No intermediate steps requiring admin coordination
4. **Scalable**: Doesn't require real-time admin-user coordination

### For Booking Creation (OTP Still Used):

1. **Immediate Verification**: Real-time validation during booking process
2. **Admin Assistance**: Admin can help with OTP if user has issues
3. **Contextual**: Verification happens within the booking workflow

## Testing

To test the activation link workflow:

1. **Access Admin Portal**: Navigate to `/admin/users` (requires admin login)
2. **Click "Add User"**: Opens the simplified user creation modal
3. **Enter User Details**: Fill in email, name, and role
4. **Create User**: Click "Create User & Send Activation"
5. **Check Email**: User receives activation email
6. **Click Activation Link**: User navigates to `/activate?token=xxx`
7. **Set Password**: User completes account setup
8. **Login**: User can immediately login with new credentials

## Configuration

Ensure these environment variables are set:

- `RESEND_API_KEY`: Your Resend API key for email delivery
- `RESEND_FROM_EMAIL`: From email address for notifications
- `NEXTAUTH_URL`: Base URL for activation links in emails

## Migration Notes

- **User Model**: Added email verification fields with proper defaults
- **API Changes**: Simplified admin user creation, removed OTP workflow for admin users
- **Database**: Migration created for new fields with proper defaults
- **Backward Compatibility**: Existing users marked as `VERIFIED` during migration
- **OTP System**: Preserved for booking creation use cases
