const request = require('supertest');

process.env.NODE_ENV = 'test';

const app = require('../src/index.js');

describe('App', () => {
  describe('GET /health', () => {
    it('returns healthy status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          service: 'role-service',
          status: 'healthy',
          database: 'postgresql',
        })
      );
      expect(res.body.timestamp).toBeDefined();
    });
  });
});
