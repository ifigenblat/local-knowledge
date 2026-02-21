const request = require('supertest');
const fs = require('fs');
const UserService = require('../src/services/UserService');

jest.mock('fs');
jest.mock('../src/services/UserService');

// Load app after mocks so routes use mocked UserService
const app = require('../src/index.js');

describe('userRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        aiProvider: 'ollama',
        cloudProvider: 'openai',
        cloudApiUrl: 'https://api.openai.com/v1',
        cloudModel: 'gpt-4o-mini',
      })
    );
  });

  describe('GET /api/users/settings', () => {
    it('returns settings (API key masked)', async () => {
      const res = await request(app).get('/api/users/settings');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('aiProvider');
      expect(res.body).toHaveProperty('cloudProvider');
      expect(res.body).toHaveProperty('cloudApiUrl');
      expect(res.body).toHaveProperty('cloudModel');
    });

    it('returns 500 when settings write fails', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ aiProvider: 'openai', cloudProvider: 'openai' })
      );
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .put('/api/users/settings')
        .set('x-user-role', 'superadmin')
        .send({ aiProvider: 'openai' });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
      consoleSpy.mockRestore();
    });
  });

  describe('PUT /api/users/settings', () => {
    it('returns 403 when not superadmin', async () => {
      const res = await request(app)
        .put('/api/users/settings')
        .set('x-user-role', 'admin')
        .send({ aiProvider: 'openai' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Super Administrator');
    });

    it('returns 400 when aiProvider invalid', async () => {
      const res = await request(app)
        .put('/api/users/settings')
        .set('x-user-role', 'superadmin')
        .send({ aiProvider: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('openai');
    });

    it('updates settings when superadmin', async () => {
      fs.writeFileSync.mockImplementation(() => {});
      // After write, readSettings() runs again; mock read to return updated content
      fs.readFileSync
        .mockReturnValueOnce(
          JSON.stringify({
            aiProvider: 'ollama',
            cloudProvider: 'openai',
            cloudApiUrl: 'https://api.openai.com/v1',
            cloudModel: 'gpt-4o-mini',
          })
        )
        .mockReturnValueOnce(
          JSON.stringify({
            aiProvider: 'openai',
            cloudProvider: 'groq',
            cloudApiUrl: 'https://api.groq.com/openai/v1',
            cloudModel: 'llama-3.1-8b-instant',
          })
        );

      const res = await request(app)
        .put('/api/users/settings')
        .set('x-user-role', 'superadmin')
        .send({
          aiProvider: 'openai',
          cloudProvider: 'groq',
          cloudApiUrl: 'https://api.groq.com/openai/v1',
          cloudModel: 'llama-3.1-8b-instant',
        });

      expect(res.status).toBe(200);
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(res.body.aiProvider).toBe('openai');
    });
  });

  describe('GET /api/users', () => {
    it('returns users and pagination', async () => {
      UserService.getAllUsers.mockResolvedValue({
        users: [{ id: '1', name: 'Alice', email: 'a@test.com' }],
        total: 1,
      });

      const res = await request(app).get('/api/users?page=1&limit=20');

      expect(res.status).toBe(200);
      expect(res.body.users).toHaveLength(1);
      expect(res.body.pagination).toHaveProperty('totalUsers', 1);
      expect(UserService.getAllUsers).toHaveBeenCalled();
    });
  });

  describe('GET /api/users/:id', () => {
    it('returns user when found', async () => {
      UserService.getUserById.mockResolvedValue({ id: '1', name: 'Alice', email: 'a@test.com' });

      const res = await request(app).get('/api/users/1');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Alice');
    });

    it('returns 404 when user not found', async () => {
      UserService.getUserById.mockRejectedValue(new Error('User not found'));

      const res = await request(app).get('/api/users/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });
  });

  describe('POST /api/users', () => {
    it('creates user and returns 201', async () => {
      UserService.createUser.mockResolvedValue({
        id: '1',
        name: 'Bob',
        email: 'b@test.com',
      });

      const res = await request(app)
        .post('/api/users')
        .send({ name: 'Bob', email: 'b@test.com', password: 'secret' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Bob');
      expect(UserService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Bob', email: 'b@test.com', password: 'secret' })
      );
    });

    it('returns 400 on validation error', async () => {
      UserService.createUser.mockRejectedValue(new Error('User with this email already exists'));

      const res = await request(app)
        .post('/api/users')
        .send({ name: 'Bob', email: 'b@test.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('updates user', async () => {
      UserService.updateUser.mockResolvedValue({
        id: '1',
        name: 'Alice Updated',
        email: 'a@test.com',
      });

      const res = await request(app)
        .put('/api/users/1')
        .send({ name: 'Alice Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Alice Updated');
    });

    it('returns 400 on error', async () => {
      UserService.updateUser.mockRejectedValue(new Error('Email already in use'));

      const res = await request(app).put('/api/users/1').send({ email: 'other@test.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('deletes user and returns 200', async () => {
      UserService.deleteUser.mockResolvedValue(undefined);

      const res = await request(app).delete('/api/users/1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User deleted successfully');
    });

    it('returns 400 when user not found', async () => {
      UserService.deleteUser.mockRejectedValue(new Error('User not found'));

      const res = await request(app).delete('/api/users/999');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/users/:id/assign-role', () => {
    it('assigns role and returns user', async () => {
      UserService.assignRoleToUser.mockResolvedValue({ id: '1', roleId: 'r1' });

      const res = await request(app)
        .post('/api/users/1/assign-role')
        .send({ roleId: 'r1' })
        .set('x-user-role', 'admin');

      expect(res.status).toBe(200);
      expect(res.body.roleId).toBe('r1');
    });

    it('returns 404 when user not found', async () => {
      UserService.assignRoleToUser.mockRejectedValue(new Error('User not found'));

      const res = await request(app)
        .post('/api/users/999/assign-role')
        .send({ roleId: 'r1' });

      expect(res.status).toBe(404);
    });

    it('returns 403 when cannot modify superadmin', async () => {
      UserService.assignRoleToUser.mockRejectedValue(
        new Error('Cannot modify superadmin user role')
      );

      const res = await request(app)
        .post('/api/users/1/assign-role')
        .send({ roleId: 'r1' })
        .set('x-user-role', 'admin');

      expect(res.status).toBe(403);
    });

    it('returns 400 when roleId missing or invalid', async () => {
      UserService.assignRoleToUser.mockRejectedValue(new Error('Role ID is required'));

      const res = await request(app)
        .post('/api/users/1/assign-role')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/users/settings processing params', () => {
    it('accepts processing params when superadmin', async () => {
      fs.writeFileSync.mockImplementation(() => {});
      fs.readFileSync
        .mockReturnValueOnce(
          JSON.stringify({
            aiProvider: 'openai',
            cloudProvider: 'openai',
            cloudApiUrl: 'https://api.openai.com/v1',
            cloudModel: 'gpt-4o-mini',
            maxExtractedTextChars: 500000,
            aiChunkChars: 6000,
          })
        )
        .mockReturnValueOnce(
          JSON.stringify({
            aiProvider: 'openai',
            maxExtractedTextChars: 100000,
            aiChunkChars: 3000,
            aiChunkDelayMs: 200,
            aiMaxTextLength: 150000,
            ollamaChunkChars: 2000,
          })
        );

      const res = await request(app)
        .put('/api/users/settings')
        .set('x-user-role', 'superadmin')
        .send({
          aiProvider: 'openai',
          maxExtractedTextChars: 100000,
          aiChunkChars: 3000,
          aiChunkDelayMs: 200,
          aiMaxTextLength: 150000,
          ollamaChunkChars: 2000,
        });

      expect(res.status).toBe(200);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });
});
