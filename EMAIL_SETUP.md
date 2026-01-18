# Email Configuration Guide

This guide explains how to set up email sending for password reset functionality.

## Local Development Options

### Option 1: MailHog (Recommended for Local Development)

MailHog is a local SMTP server that captures all emails and provides a web UI to view them.

#### Installation (macOS)
```bash
brew install mailhog
```

#### Installation (Linux)
```bash
# Download from https://github.com/mailhog/MailHog/releases
# Or use Go: go install github.com/mailhog/MailHog@latest
```

#### Installation (Windows)
Download from: https://github.com/mailhog/MailHog/releases

#### Usage
1. Start MailHog:
   ```bash
   mailhog
   ```

2. MailHog will run on:
   - SMTP Server: `localhost:1025`
   - Web UI: `http://localhost:8025`

3. The application is already configured to use MailHog by default in development mode.

4. View all sent emails at: http://localhost:8025

### Option 2: Ethereal Email (Automatic - No Setup Required)

If MailHog is not installed, the application will automatically create a test account using Ethereal Email. This is a free service that creates temporary email accounts for testing.

- **No installation required**
- Test account credentials are logged to the console
- View emails at: https://ethereal.email
- Account details are printed when the first email is sent

### Option 3: Gmail (For Testing Real Emails)

If you want to test with real email delivery:

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Create a new app password
3. Add to `server/.env`:
   ```env
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

## Configuration

The email configuration is in `server/.env`:

```env
# MailHog (default for local dev)
MAILHOG_HOST=localhost
MAILHOG_PORT=1025

# Or Gmail
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Or Custom SMTP (for production)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-password
SMTP_FROM=noreply@yourdomain.com
```

## How It Works

1. **Development Mode (default)**:
   - First tries MailHog if available
   - Falls back to Ethereal Email if MailHog not running
   - Logs reset links to console if neither available

2. **Production Mode**:
   - Requires SMTP configuration
   - Uses environment variables for SMTP settings

## Testing

1. Start your server:
   ```bash
   npm run dev
   ```

2. If using MailHog, start it in a separate terminal:
   ```bash
   mailhog
   ```

3. Request a password reset from the login page

4. Check emails:
   - **MailHog**: http://localhost:8025
   - **Ethereal**: https://ethereal.email (credentials in console)
   - **Gmail**: Check your inbox

## Production Setup

For production, configure a real SMTP server:

```env
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-secure-password
SMTP_FROM=noreply@yourdomain.com
CLIENT_URL=https://yourdomain.com
```

Popular SMTP services:
- **SendGrid**: https://sendgrid.com
- **Mailgun**: https://mailgun.com
- **Amazon SES**: https://aws.amazon.com/ses/
- **Postmark**: https://postmarkapp.com
