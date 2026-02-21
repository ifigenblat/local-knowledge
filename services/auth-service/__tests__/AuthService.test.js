const AuthService = require('../src/services/AuthService');
const { getUserRepository } = require('../src/repositories/UserRepositoryFactory');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../src/repositories/UserRepositoryFactory');
jest.mock('axios');

describe('AuthService', () => {
  let mockRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      findByEmail: jest.fn(),
      findByEmailWithRole: jest.fn(),
      findByIdWithRole: jest.fn(),
      findByResetToken: jest.fn(),
      count: jest.fn(),
      updatePasswordResetToken: jest.fn(),
      updatePassword: jest.fn(),
    };
    getUserRepository.mockResolvedValue(mockRepo);
  });

  describe('login', () => {
    it('returns token and user when credentials valid', async () => {
      const hashed = await bcrypt.hash('pass123', 10);
      mockRepo.findByEmailWithRole.mockResolvedValue({
        id: '1',
        _id: '1',
        name: 'Alice',
        email: 'a@test.com',
        password: hashed,
        Role: { name: 'user' },
      });

      const result = await AuthService.login('a@test.com', 'pass123');

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('a@test.com');
      expect(result.user.name).toBe('Alice');
    });

    it('throws when user not found', async () => {
      mockRepo.findByEmailWithRole.mockResolvedValue(null);

      await expect(AuthService.login('nobody@test.com', 'pass')).rejects.toThrow('Invalid credentials');
    });

    it('throws when password wrong', async () => {
      const hashed = await bcrypt.hash('right', 10);
      mockRepo.findByEmailWithRole.mockResolvedValue({ id: '1', email: 'a@test.com', password: hashed });

      await expect(AuthService.login('a@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('validateToken', () => {
    it('returns user when token valid and user exists', async () => {
      const token = jwt.sign({ id: '1' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
      mockRepo.findByIdWithRole.mockResolvedValue({
        id: '1',
        _id: '1',
        name: 'Alice',
        email: 'a@test.com',
        Role: { name: 'user' },
      });

      const result = await AuthService.validateToken(token);

      expect(result.id).toBe('1');
      expect(result.email).toBe('a@test.com');
    });

    it('throws when token invalid', async () => {
      await expect(AuthService.validateToken('bad-token')).rejects.toThrow('Invalid token');
    });

    it('throws when user not found', async () => {
      const token = jwt.sign({ id: '999' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
      mockRepo.findByIdWithRole.mockResolvedValue(null);

      await expect(AuthService.validateToken(token)).rejects.toThrow('Invalid token');
    });
  });

  describe('changePassword', () => {
    it('throws when userId missing', async () => {
      await expect(AuthService.changePassword(null, 'old', 'new123')).rejects.toThrow('User not found');
      await expect(AuthService.changePassword('', 'old', 'new123')).rejects.toThrow('User not found');
    });

    it('throws when current or new password missing', async () => {
      await expect(AuthService.changePassword('1', '', 'new123')).rejects.toThrow('required');
      await expect(AuthService.changePassword('1', 'old', '')).rejects.toThrow('required');
    });

    it('throws when user not found', async () => {
      mockRepo.findByIdWithRole.mockResolvedValue(null);

      await expect(AuthService.changePassword('999', 'old', 'new123')).rejects.toThrow('User not found');
    });

    it('throws when current password wrong', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      mockRepo.findByIdWithRole.mockResolvedValue({ id: '1', password: hashed });

      await expect(AuthService.changePassword('1', 'wrong', 'newpass123')).rejects.toThrow(
        'Current password is incorrect'
      );
    });

    it('throws when new password too short', async () => {
      mockRepo.findByIdWithRole.mockResolvedValue({ id: '1', password: 'hash' });

      await expect(AuthService.changePassword('1', 'old', 'short')).rejects.toThrow('at least 6');
    });

    it('updates password when current correct', async () => {
      const hashed = await bcrypt.hash('oldpass', 10);
      mockRepo.findByIdWithRole.mockResolvedValue({ id: '1', password: hashed });
      mockRepo.updatePassword.mockResolvedValue(undefined);

      const result = await AuthService.changePassword('1', 'oldpass', 'newpass123');

      expect(mockRepo.updatePassword).toHaveBeenCalledWith('1', expect.any(String));
      expect(result.message).toContain('updated');
    });
  });

  describe('resetPassword', () => {
    it('throws when token missing', async () => {
      await expect(AuthService.resetPassword('', 'newpass123')).rejects.toThrow('Reset token is required');
    });

    it('throws when token invalid format', async () => {
      await expect(AuthService.resetPassword('short', 'newpass123')).rejects.toThrow();
    });

    it('throws when password too short', async () => {
      await expect(
        AuthService.resetPassword('a'.repeat(64), '12345')
      ).rejects.toThrow('at least 6 characters');
    });

    it('throws when reset token not found', async () => {
      mockRepo.findByResetToken.mockResolvedValue(null);

      await expect(
        AuthService.resetPassword('a'.repeat(64), 'newpass123')
      ).rejects.toThrow('Invalid or expired');
    });

    it('updates password when token valid', async () => {
      mockRepo.findByResetToken.mockResolvedValue({ id: '1', _id: '1' });
      mockRepo.updatePassword.mockResolvedValue(undefined);

      const result = await AuthService.resetPassword('a'.repeat(64), 'newpass123');

      expect(mockRepo.updatePassword).toHaveBeenCalledWith('1', expect.any(String));
      expect(result.message).toContain('reset successfully');
    });
  });

  describe('register', () => {
    it('throws when user already exists', async () => {
      mockRepo.findByEmail.mockResolvedValue({ id: '1', email: 'a@t.com' });

      await expect(AuthService.register('Alice', 'a@t.com', 'pass123')).rejects.toThrow('User already exists');
    });

    it('creates user and returns token when role and user service succeed', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.count.mockResolvedValue(1);
      mockRepo.findByIdWithRole.mockResolvedValue({
        id: '1',
        _id: '1',
        name: 'Alice',
        email: 'a@t.com',
        Role: { name: 'user' },
      });
      axios.get.mockResolvedValue({ data: { _id: 'role-1' } });
      axios.post.mockResolvedValue({ data: { _id: '1', id: '1', name: 'Alice', email: 'a@t.com' } });

      const result = await AuthService.register('Alice', 'a@t.com', 'pass123');

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('a@t.com');
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/name/user'));
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/users'),
        expect.objectContaining({ name: 'Alice', email: 'a@t.com' })
      );
    });

    it('assigns admin role for first user', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.count.mockResolvedValue(0);
      mockRepo.findByIdWithRole.mockResolvedValue({
        id: '1',
        _id: '1',
        name: 'Admin',
        email: 'admin@t.com',
        Role: { name: 'admin' },
      });
      axios.get.mockResolvedValue({ data: { _id: 'admin-role' } });
      axios.post.mockResolvedValue({ data: { _id: '1', id: '1', name: 'Admin', email: 'admin@t.com' } });

      await AuthService.register('Admin', 'admin@t.com', 'pass123');

      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/name/admin'));
    });

    it('throws when user service create fails', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.count.mockResolvedValue(1);
      axios.get.mockResolvedValue({ data: { _id: 'r1' } });
      axios.post.mockRejectedValue({ response: { data: { error: 'Duplicate email' } } });

      await expect(AuthService.register('A', 'a@t.com', 'pass123')).rejects.toThrow('Duplicate email');
    });
  });

  describe('requestPasswordReset', () => {
    it('returns generic message when user not found', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);

      const result = await AuthService.requestPasswordReset('nobody@test.com');

      expect(result.message).toContain('If that email exists');
    });

    it('updates reset token and returns message when user found and no email service', async () => {
      mockRepo.findByEmail.mockResolvedValue({ id: '1', _id: '1', email: 'a@t.com' });
      mockRepo.updatePasswordResetToken.mockResolvedValue(undefined);
      const origEnv = process.env.EMAIL_SERVICE_URL;
      process.env.EMAIL_SERVICE_URL = '';
      process.env.NODE_ENV = 'development';

      const result = await AuthService.requestPasswordReset('a@t.com');

      expect(mockRepo.updatePasswordResetToken).toHaveBeenCalled();
      expect(result.message).toBeDefined();
      expect(result.token).toBeDefined();
      process.env.EMAIL_SERVICE_URL = origEnv;
    });

    it('sends email when EMAIL_SERVICE_URL set and returns message', async () => {
      mockRepo.findByEmail.mockResolvedValue({ id: '1', _id: '1', email: 'a@t.com' });
      mockRepo.updatePasswordResetToken.mockResolvedValue(undefined);
      const orig = process.env.EMAIL_SERVICE_URL;
      process.env.EMAIL_SERVICE_URL = 'http://email:5000';
      axios.post.mockResolvedValue({ data: { success: true } });

      const result = await AuthService.requestPasswordReset('a@t.com');

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('send-password-reset'),
        expect.objectContaining({ email: 'a@t.com', resetToken: expect.any(String) })
      );
      expect(result.message).toContain('If that email exists');
      process.env.EMAIL_SERVICE_URL = orig;
    });
  });

  describe('generateToken and formatUserForJWT', () => {
    it('generateToken returns a JWT string', () => {
      const user = { id: '1', _id: '1', name: 'A', email: 'a@t.com', Role: { name: 'user' } };
      const token = AuthService.generateToken(user);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('formatUserForJWT returns user without password', () => {
      const user = { id: '1', _id: '1', name: 'A', email: 'a@t.com', password: 'secret', Role: { name: 'user' } };
      const formatted = AuthService.formatUserForJWT(user);
      expect(formatted.password).toBeUndefined();
      expect(formatted.email).toBe('a@t.com');
    });
  });
});
