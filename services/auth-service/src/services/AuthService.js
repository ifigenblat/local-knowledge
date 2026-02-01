const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const UserRepository = require('../repositories/UserRepository');

class AuthService {
  constructor() {
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:5002';
    this.roleServiceUrl = process.env.ROLE_SERVICE_URL || 'http://localhost:5003';
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  }

  async register(name, email, password) {
    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Get default role from role service
    let defaultRoleId = null;
    try {
      const userCount = await UserRepository.count();
      
      if (userCount === 0) {
        // First user gets admin role
        const response = await axios.get(`${this.roleServiceUrl}/api/roles/name/admin`);
        if (response.data) {
          defaultRoleId = response.data._id;
        }
      } else {
        // Subsequent users get user role
        const response = await axios.get(`${this.roleServiceUrl}/api/roles/name/user`);
        if (response.data) {
          defaultRoleId = response.data._id;
        }
      }
    } catch (error) {
      console.error('Error fetching default role:', error);
      // Continue without role, will be assigned later
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user via user service
    try {
      const userResponse = await axios.post(`${this.userServiceUrl}/api/users`, {
        name,
        email,
        password: hashedPassword,
        roleId: defaultRoleId
      });

      const user = userResponse.data;

      // Populate role for JWT
      const userWithRole = await UserRepository.findByIdWithRole(user._id || user.id);

      // Generate JWT
      const token = this.generateToken(userWithRole);

      return { token, user: this.formatUserForJWT(userWithRole) };
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(error.response?.data?.error || 'Failed to create user');
    }
  }

  async login(email, password) {
    // With bufferCommands: true, Mongoose will buffer queries if not connected
    // The middleware already ensures connection, so we can proceed
    const user = await UserRepository.findByEmailWithRole(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT
    const token = this.generateToken(user);

    return { token, user: this.formatUserForJWT(user) };
  }

  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const user = await UserRepository.findByIdWithRole(decoded.id);
      
      if (!user) {
        throw new Error('User not found');
      }

      return this.formatUserForJWT(user);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async requestPasswordReset(email) {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists (security)
      return { message: 'If that email exists, a password reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpires = Date.now() + 3600000; // 1 hour

    await UserRepository.updatePasswordResetToken(
      user._id,
      resetTokenHash,
      resetTokenExpires
    );

    // Send email via email service if configured
    const emailServiceUrl = process.env.EMAIL_SERVICE_URL;
    if (emailServiceUrl) {
      try {
        const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        const response = await axios.post(`${emailServiceUrl.replace(/\/$/, '')}/send-password-reset`, {
          email: user.email,
          resetToken,
          baseUrl,
        });
        if (!response.data?.success && !response.data?.development) {
          console.warn('Email service returned:', response.data);
        }
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError.message);
        // In dev, fall through to return token
        if (process.env.NODE_ENV === 'development') {
          return {
            message: 'Password reset token generated (email failed)',
            token: resetToken,
            expires: resetTokenExpires
          };
        }
      }
    } else if (process.env.NODE_ENV === 'development') {
      return {
        message: 'Password reset token generated',
        token: resetToken,
        expires: resetTokenExpires
      };
    }

    return { message: 'If that email exists, a password reset link has been sent.' };
  }

  async resetPassword(token, newPassword) {
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await UserRepository.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await UserRepository.updatePassword(user._id, hashedPassword);

    return { message: 'Password reset successfully' };
  }

  generateToken(user) {
    const payload = {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role ? {
        id: user.role._id || user.role.id,
        name: user.role.name,
        displayName: user.role.displayName,
        permissions: user.role.permissions
      } : null,
      mustChangePassword: user.mustChangePassword || false
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: '7d' });
  }

  formatUserForJWT(user) {
    return {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role ? {
        id: user.role._id || user.role.id,
        name: user.role.name,
        displayName: user.role.displayName,
        permissions: user.role.permissions
      } : null,
      mustChangePassword: user.mustChangePassword || false
    };
  }
}

module.exports = new AuthService();
