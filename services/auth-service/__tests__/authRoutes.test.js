const request = require('supertest');

jest.mock('../src/repositories/UserRepositoryFactory', () => ({ getUserRepository: jest.fn() }));
jest.mock('../src/services/AuthService');

const AuthService = require('../src/services/AuthService');
const app = require('../src/index.js');

describe('authRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('returns 400 when name missing', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'a@t.com', password: 'pass' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('returns 201 when register succeeds', async () => {
      AuthService.register.mockResolvedValue({ token: 'jwt', user: { id: '1', email: 'a@t.com' } });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Alice', email: 'a@t.com', password: 'pass123' });

      expect(res.status).toBe(201);
      expect(res.body.token).toBe('jwt');
      expect(res.body.user.email).toBe('a@t.com');
    });

    it('returns 400 when register fails', async () => {
      AuthService.register.mockRejectedValue(new Error('User already exists'));

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Alice', email: 'a@t.com', password: 'pass123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when email or password missing', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'a@t.com' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('returns 200 and token when login succeeds', async () => {
      AuthService.login.mockResolvedValue({ token: 'jwt', user: { id: '1', email: 'a@t.com' } });

      const res = await request(app).post('/api/auth/login').send({ email: 'a@t.com', password: 'pass' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBe('jwt');
      expect(AuthService.login).toHaveBeenCalledWith('a@t.com', 'pass');
    });

    it('returns 400 when invalid credentials', async () => {
      AuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const res = await request(app).post('/api/auth/login').send({ email: 'a@t.com', password: 'wrong' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/validate', () => {
    it('returns 401 when no token', async () => {
      const res = await request(app).get('/api/auth/validate');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('No token');
    });

    it('returns 200 and user when token valid', async () => {
      AuthService.validateToken.mockResolvedValue({ id: '1', email: 'a@t.com' });

      const res = await request(app).get('/api/auth/validate').set('Authorization', 'Bearer some-token');

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.user.email).toBe('a@t.com');
    });

    it('returns 401 when token invalid', async () => {
      AuthService.validateToken.mockRejectedValue(new Error('Invalid token'));

      const res = await request(app).get('/api/auth/validate').set('Authorization', 'Bearer bad');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('returns 400 when email missing', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({});
      expect(res.status).toBe(400);
    });

    it('returns 200 with message', async () => {
      AuthService.requestPasswordReset.mockResolvedValue({ message: 'If that email exists...' });

      const res = await request(app).post('/api/auth/forgot-password').send({ email: 'a@t.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });
  });

  describe('PUT /api/auth/password', () => {
    it('returns 400 when current or new password missing', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .set('x-user-id', '1')
        .send({ currentPassword: 'old' });
      expect(res.status).toBe(400);
    });

    it('returns 200 when change succeeds', async () => {
      AuthService.changePassword.mockResolvedValue({ message: 'Password updated successfully' });

      const res = await request(app)
        .put('/api/auth/password')
        .set('x-user-id', '1')
        .send({ currentPassword: 'old', newPassword: 'new123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('updated');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('returns 400 when token or newPassword missing', async () => {
      const res = await request(app).post('/api/auth/reset-password').send({ token: 'x' });
      expect(res.status).toBe(400);
    });

    it('returns 200 when reset succeeds', async () => {
      AuthService.resetPassword.mockResolvedValue({ message: 'Password reset successfully' });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'a'.repeat(64), newPassword: 'newpass123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('reset');
    });
  });
});
