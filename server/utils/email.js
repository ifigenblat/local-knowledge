const nodemailer = require('nodemailer');

// Create transporter - using environment variables or local development defaults
const createTransporter = async () => {
  // For production, use environment variables
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
  }

  // For local development - MailHog (default: 127.0.0.1:1025)
  if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_USER) {
    const mailhogHost = process.env.MAILHOG_HOST || '127.0.0.1';
    const mailhogPort = process.env.MAILHOG_PORT || 1025;
    
    console.log(`📧 Using MailHog for local email testing (${mailhogHost}:${mailhogPort})`);
    console.log(`📬 View emails at: http://${mailhogHost}:8025`);
    
    return nodemailer.createTransport({
      host: mailhogHost,
      port: parseInt(mailhogPort),
      secure: false,
      // No auth needed for MailHog
    });
  }

  // For development/testing - using Gmail
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: Create a test account using Ethereal Email
  if (process.env.NODE_ENV !== 'production') {
    console.log('📧 Creating Ethereal test account for email testing...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log('✅ Ethereal account created!');
      console.log(`📬 View emails at: https://ethereal.email`);
      console.log(`   Test account: ${testAccount.user}`);
      console.log(`   Test password: ${testAccount.pass}`);
      
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (error) {
      console.error('Failed to create Ethereal account:', error);
    }
  }

  // Fallback: Log to console
  console.warn('⚠️  No SMTP configuration found. Email sending will not work.');
  return null;
};

const sendPasswordResetEmail = async (email, resetToken, baseUrl = 'http://localhost:3000') => {
  console.log('Creating email transporter...');
  const transporter = await createTransporter();
  
  if (!transporter) {
    console.error('Cannot send email: No SMTP transporter configured');
    // For development, log the reset link instead
    console.log('='.repeat(60));
    console.log('PASSWORD RESET LINK (Development Mode):');
    console.log(`${baseUrl}/reset-password?token=${resetToken}`);
    console.log('='.repeat(60));
    return { success: true, development: true };
  }
  
  console.log('Email transporter created successfully');

  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@localknowledge.com',
    to: email,
    subject: 'Password Reset Request - LocalKnowledge',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; margin: 20px 0;">
            <h1 style="color: #4F46E5; margin-top: 0;">Password Reset Request</h1>
            <p>Hello,</p>
            <p>You have requested to reset your password for your LocalKnowledge account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${resetUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 12px; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
            </p>
            <p style="color: #999; font-size: 12px;">
              Best regards,<br>
              The LocalKnowledge Team
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Password Reset Request - LocalKnowledge

      Hello,

      You have requested to reset your password for your LocalKnowledge account.

      Click the following link to reset your password:
      ${resetUrl}

      This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.

      Best regards,
      The LocalKnowledge Team
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
};
