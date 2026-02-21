const request = require('supertest');
const RoleService = require('../src/services/RoleService');

jest.mock('../src/services/RoleService');

const app = require('../src/index.js');

describe('roleRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/roles', () => {
    it('returns all roles', async () => {
      RoleService.getAllRoles.mockResolvedValue([{ id: '1', name: 'admin' }]);

      const res = await request(app).get('/api/roles');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: '1', name: 'admin' }]);
    });

    it('returns 500 on error', async () => {
      RoleService.getAllRoles.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/roles');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('DB error');
    });
  });

  describe('GET /api/roles/:id', () => {
    it('returns role when found', async () => {
      RoleService.getRoleById.mockResolvedValue({ id: '1', name: 'admin' });

      const res = await request(app).get('/api/roles/1');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('admin');
    });

    it('returns 404 when not found', async () => {
      RoleService.getRoleById.mockRejectedValue(new Error('Role not found'));

      const res = await request(app).get('/api/roles/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Role not found');
    });
  });

  describe('GET /api/roles/name/:name', () => {
    it('returns role when found', async () => {
      RoleService.getRoleByName.mockResolvedValue({ id: '1', name: 'admin' });

      const res = await request(app).get('/api/roles/name/admin');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('admin');
    });

    it('returns 404 when not found', async () => {
      RoleService.getRoleByName.mockResolvedValue(null);

      const res = await request(app).get('/api/roles/name/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Role not found');
    });
  });

  describe('POST /api/roles', () => {
    it('creates role and returns 201', async () => {
      RoleService.createRole.mockResolvedValue({ id: '1', name: 'editor', displayName: 'Editor' });

      const res = await request(app)
        .post('/api/roles')
        .send({ name: 'editor', displayName: 'Editor' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('editor');
      expect(RoleService.createRole).toHaveBeenCalledWith({ name: 'editor', displayName: 'Editor' });
    });

    it('returns 400 on error', async () => {
      RoleService.createRole.mockRejectedValue(new Error('Role with this name already exists'));

      const res = await request(app).post('/api/roles').send({ name: 'admin' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/roles/:id', () => {
    it('updates role', async () => {
      RoleService.updateRole.mockResolvedValue({ id: '1', name: 'editor', displayName: 'Updated' });

      const res = await request(app).put('/api/roles/1').send({ displayName: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe('Updated');
    });

    it('returns 400 when immutable', async () => {
      RoleService.updateRole.mockRejectedValue(new Error('Cannot modify an immutable role'));

      const res = await request(app).put('/api/roles/1').send({ displayName: 'X' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/roles/:id', () => {
    it('deletes role and returns 200', async () => {
      RoleService.deleteRole.mockResolvedValue(undefined);

      const res = await request(app).delete('/api/roles/1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Role deleted successfully');
    });

    it('returns 400 when cannot delete', async () => {
      RoleService.deleteRole.mockRejectedValue(new Error('Cannot delete system role'));

      const res = await request(app).delete('/api/roles/1');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/roles/:id/assign', () => {
    it('returns 400 when userId missing', async () => {
      const res = await request(app).post('/api/roles/1/assign').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('User ID');
    });
  });

  describe('GET /api/roles/:id/users', () => {
    it('returns users when RoleService and fetch succeed', async () => {
      RoleService.getRoleById.mockResolvedValue({ _id: 'r1' });
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ users: [] }),
      });

      const res = await request(app).get('/api/roles/r1/users');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      global.fetch = originalFetch;
    });

    it('returns 500 when role not found', async () => {
      RoleService.getRoleById.mockRejectedValue(new Error('Role not found'));

      const res = await request(app).get('/api/roles/999/users');

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Role not found');
    });
  });

  describe('POST /api/roles/:id/assign', () => {
    it('returns 400 when role not found', async () => {
      RoleService.getRoleById.mockRejectedValue(new Error('Role not found'));

      const res = await request(app).post('/api/roles/999/assign').send({ userId: 'u1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('calls RoleService and userServiceFetch when role exists', async () => {
      RoleService.getRoleById.mockResolvedValue({ id: 'r1' });
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'u1', name: 'Test', roleId: 'r1' }),
      });

      const res = await request(app).post('/api/roles/r1/assign').send({ userId: 'u1' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('assigned');
      global.fetch = originalFetch;
    });
  });
});
