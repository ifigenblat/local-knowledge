const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const { getUserRepository } = require('../repositories/UserRepositoryFactory');

class AuthService {
  constructor() {
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:5002';
    this.roleServiceUrl = process.env.ROLE_SERVICE_URL || 'http://localhost:5003';
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  }

  async register(name, email, password) {
    const UserRepository = await getUserRepository();
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
    const UserRepository = await getUserRepository();
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
      const UserRepository = await getUserRepository();
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
    const UserRepository = await getUserRepository();
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
      user.id || user._id,
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
    if (!token || typeof token !== 'string') {
      throw new Error('Reset token is required. Please use the link from your email or request a new password reset.');
    }
    const trimmedToken = token.trim();
    if (trimmedToken.length !== 64 || !/^[a-f0-9]+$/i.test(trimmedToken)) {
      throw new Error('Reset link may be incomplete or invalid. Please request a new password reset from the forgot-password page.');
    }
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const UserRepository = await getUserRepository();
    const resetTokenHash = crypto.createHash('sha256').update(trimmedToken).digest('hex');
    const user = await UserRepository.findByResetToken(resetTokenHash);

    if (!user) {
      throw new Error('Invalid or expired reset token. Please request a new password reset.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await UserRepository.updatePassword(user.id || user._id, hashedPassword);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId, currentPassword, newPassword) {
    if (!userId) {
      throw new Error('User not found. Please log in again.');
    }
    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required');
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    const UserRepository = await getUserRepository();
    const user = await UserRepository.findByIdWithRole(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await UserRepository.updatePassword(userId, hashedPassword);

    return { message: 'Password updated successfully' };
  }

  generateToken(user) {
    const role = user.Role || user.role;
    const payload = {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: role ? {
        id: role._id || role.id,
        name: role.name,
        displayName: role.displayName,
        permissions: role.permissions
      } : null,
      mustChangePassword: user.mustChangePassword || false
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: '7d' });
  }

  formatUserForJWT(user) {
    const role = user.Role || user.role;
    return {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: role ? {
        id: role._id || role.id,
        name: role.name,
        displayName: role.displayName,
        permissions: role.permissions
      } : null,
      mustChangePassword: user.mustChangePassword || false
    };
  }
}

module.exports = new AuthService();
