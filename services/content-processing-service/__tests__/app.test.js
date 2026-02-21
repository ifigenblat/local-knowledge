const request = require('supertest');
process.env.NODE_ENV = 'test';
const app = require('../src/index.js');

describe('Content Processing Service App', () => {
  it('GET /health returns healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('content-processing-service');
    expect(res.body.status).toBe('healthy');
  });
});
