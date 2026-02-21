const request = require('supertest');
const path = require('path');
const fs = require('fs');

jest.mock('fs');
jest.mock('mammoth', () => ({ convertToHtml: jest.fn() }));
jest.mock('xlsx', () => ({ readFile: jest.fn() }));

process.env.NODE_ENV = 'test';
const app = require('../src/index.js');

describe('previewRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /:filename', () => {
    it('returns 400 when path traversal attempted', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isFile: () => true });

      const res = await request(app).get('/..%2Fetc%2Fpasswd');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });

    it('returns 404 when file does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      const res = await request(app).get('/nonexistent.pdf');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });
});
