const request = require('supertest');

process.env.NODE_ENV = 'test';

jest.mock('../src/repositories/CardRepositoryFactory', () => ({ getCardRepository: jest.fn() }));

const app = require('../src/index.js');

describe('App', () => {
  describe('GET /health', () => {
    it('returns healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          service: 'card-service',
          status: 'healthy',
        })
      );
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/cards/count', () => {
    it('returns 401 when no user', async () => {
      const res = await request(app).get('/api/cards/count');
      expect(res.status).toBe(401);
    });

    it('returns 200 and count when user present', async () => {
      const { getCardRepository } = require('../src/repositories/CardRepositoryFactory');
      getCardRepository.mockResolvedValue({ countByUser: jest.fn().mockResolvedValue(5) });

      const res = await request(app)
        .get('/api/cards/count')
        .set('x-user-id', 'user-1')
        .set('x-user-email', 'u@t.com');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(5);
    });
  });
});
