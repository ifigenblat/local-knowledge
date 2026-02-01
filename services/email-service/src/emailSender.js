const nodemailer = require('nodemailer');

const createTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
  }

  if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_USER) {
    const mailhogHost = process.env.MAILHOG_HOST || '127.0.0.1';
    const mailhogPort = process.env.MAILHOG_PORT || 1025;
    console.log(`📧 Using MailHog for local email (${mailhogHost}:${mailhogPort})`);
    return nodemailer.createTransport({
      host: mailhogHost,
      port: parseInt(mailhogPort),
      secure: false,
    });
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('📧 Creating Ethereal test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    } catch (error) {
      console.error('Ethereal account failed:', error);
    }
  }

  return null;
};

const sendPasswordResetEmail = async (email, resetToken, baseUrl = process.env.CLIENT_URL || 'http://localhost:3000') => {
  const transporter = await createTransporter();

  if (!transporter) {
    console.warn('No SMTP configured. Logging reset link.');
    console.log('PASSWORD RESET:', `${baseUrl}/reset-password?token=${resetToken}`);
    return { success: true, development: true };
  }

  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@localknowledge.com',
    to: email,
    subject: 'Password Reset Request - LocalKnowledge',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
            <h1 style="color: #4F46E5; margin-top: 0;">Password Reset Request</h1>
            <p>You have requested to reset your password. Click below to reset:</p>
            <p><a href="${resetUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
            <p style="color: #666; font-size: 12px;">Or copy: ${resetUrl}</p>
            <p style="color: #999; font-size: 12px;">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
          </div>
        </body>
      </html>
    `,
    text: `Password Reset - LocalKnowledge\n\nClick to reset: ${resetUrl}\n\nLink expires in 1 hour.`,
  };

  const info = await transporter.sendMail(mailOptions);
  return { success: true, messageId: info.messageId };
};

module.exports = { sendPasswordResetEmail, createTransporter };
