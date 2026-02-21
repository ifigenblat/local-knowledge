const request = require('supertest');

jest.mock('../src/emailSender', () => ({
  sendPasswordResetEmail: jest.fn(),
  createTransporter: jest.fn(),
}));

const { sendPasswordResetEmail, createTransporter } = require('../src/emailSender');

process.env.NODE_ENV = 'test';
const app = require('../src/index.js');

describe('emailRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /send-password-reset', () => {
    it('returns 400 when email or resetToken missing', async () => {
      const res1 = await request(app).post('/send-password-reset').send({ resetToken: 't' });
      expect(res1.status).toBe(400);
      expect(res1.body.error).toContain('required');

      const res2 = await request(app).post('/send-password-reset').send({ email: 'a@t.com' });
      expect(res2.status).toBe(400);
    });

    it('returns 200 and result when send succeeds', async () => {
      sendPasswordResetEmail.mockResolvedValue({ success: true });

      const res = await request(app)
        .post('/send-password-reset')
        .send({ email: 'a@t.com', resetToken: 'token123', baseUrl: 'http://localhost:3000' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(sendPasswordResetEmail).toHaveBeenCalledWith('a@t.com', 'token123', 'http://localhost:3000');
    });

    it('returns 500 when send throws', async () => {
      sendPasswordResetEmail.mockRejectedValue(new Error('SMTP failed'));

      const res = await request(app)
        .post('/send-password-reset')
        .send({ email: 'a@t.com', resetToken: 't' });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Failed to send');
    });
  });

  describe('GET /status', () => {
    it('returns configured true when transporter exists', async () => {
      createTransporter.mockResolvedValue({});

      const res = await request(app).get('/status');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(true);
      expect(res.body.message).toBeDefined();
    });

    it('returns configured false when transporter is null', async () => {
      createTransporter.mockResolvedValue(null);

      const res = await request(app).get('/status');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(false);
    });

    it('returns 500 when createTransporter throws', async () => {
      createTransporter.mockRejectedValue(new Error('Config error'));

      const res = await request(app).get('/status');

      expect(res.status).toBe(500);
      expect(res.body.configured).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });
});
