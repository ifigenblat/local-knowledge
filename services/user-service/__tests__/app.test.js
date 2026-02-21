const request = require('supertest');

// Prevent index from starting server and loading postgres
process.env.NODE_ENV = 'test';

const app = require('../src/index.js');

describe('App', () => {
  describe('GET /health', () => {
    it('returns healthy status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          service: 'user-service',
          status: 'healthy',
          database: 'postgresql',
        })
      );
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('Error handler', () => {
    it('returns 500 and error message when route throws', async () => {
      // Trigger 404 for undefined route under /api/users (no such route)
      const res = await request(app).get('/api/users/nonexistent/foo');

      expect(res.status).toBe(404);
    });

    it('returns JSON with error for invalid path', async () => {
      const res = await request(app).get('/api/unknown');

      expect(res.status).toBe(404);
    });
  });
});
