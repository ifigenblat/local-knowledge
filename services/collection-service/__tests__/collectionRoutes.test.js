const request = require('supertest');

jest.mock('../src/repositories/CollectionRepositoryFactory', () => ({ getCollectionRepository: jest.fn() }));

const { getCollectionRepository } = require('../src/repositories/CollectionRepositoryFactory');
const app = require('../src/index.js');

const authHeaders = { 'x-user-id': 'user-1', 'x-user-email': 'u@t.com' };

describe('collectionRoutes', () => {
  let mockRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      findByUser: jest.fn(),
      create: jest.fn(),
      addCard: jest.fn(),
      removeCard: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    getCollectionRepository.mockResolvedValue(mockRepo);
  });

  describe('GET /api/collections', () => {
    it('returns 401 when no user', async () => {
      const res = await request(app).get('/api/collections');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('No token');
    });

    it('returns 200 and collections', async () => {
      mockRepo.findByUser.mockResolvedValue([{ id: '1', name: 'C1' }]);

      const res = await request(app).get('/api/collections').set(authHeaders);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].name).toBe('C1');
    });

    it('returns 500 when repo throws', async () => {
      getCollectionRepository.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/collections').set(authHeaders);

      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /api/collections', () => {
    it('returns 400 when name missing', async () => {
      const res = await request(app).post('/api/collections').set(authHeaders).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Name is required');
    });

    it('returns 201 and collection when created', async () => {
      const created = { id: '1', name: 'My Collection', cards: [], toJSON: () => ({ id: '1', name: 'My Collection', cards: [] }) };
      mockRepo.create.mockResolvedValue(created);

      const res = await request(app)
        .post('/api/collections')
        .set(authHeaders)
        .send({ name: 'My Collection', description: 'Desc' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('My Collection');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Collection', description: 'Desc', userId: 'user-1' })
      );
    });

    it('returns 500 when repo create throws', async () => {
      mockRepo.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app).post('/api/collections').set(authHeaders).send({ name: 'C' });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/collections/:id', () => {
    it('returns 404 when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const res = await request(app).get('/api/collections/1').set(authHeaders);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('returns 200 and collection when found', async () => {
      const collection = { id: '1', name: 'C1' };
      mockRepo.findById.mockResolvedValue(collection);

      const res = await request(app).get('/api/collections/1').set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('C1');
    });
  });

  describe('PUT /api/collections/:id', () => {
    it('returns 404 when not found', async () => {
      mockRepo.update.mockResolvedValue(null);

      const res = await request(app).put('/api/collections/1').set(authHeaders).send({ name: 'New' });

      expect(res.status).toBe(404);
    });

    it('returns 200 and collection when updated', async () => {
      const updated = { id: '1', name: 'Updated' };
      mockRepo.update.mockResolvedValue(updated);
      mockRepo.findById.mockResolvedValue(updated);

      const res = await request(app).put('/api/collections/1').set(authHeaders).send({ name: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated');
    });
  });

  describe('DELETE /api/collections/:id', () => {
    it('returns 404 when not found', async () => {
      mockRepo.delete.mockResolvedValue(null);

      const res = await request(app).delete('/api/collections/1').set(authHeaders);

      expect(res.status).toBe(404);
    });

    it('returns 200 and message when deleted', async () => {
      mockRepo.delete.mockResolvedValue({ id: '1' });

      const res = await request(app).delete('/api/collections/1').set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });
  });

  describe('POST /api/collections/:id/cards', () => {
    it('returns 400 when cardId missing', async () => {
      const res = await request(app).post('/api/collections/1/cards').set(authHeaders).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('cardId is required');
    });

    it('returns 404 when collection not found', async () => {
      mockRepo.addCard.mockResolvedValue(null);

      const res = await request(app).post('/api/collections/1/cards').set(authHeaders).send({ cardId: 'c1' });

      expect(res.status).toBe(404);
    });

    it('returns 200 and collection when card added', async () => {
      const collection = { id: '1', cards: ['c1'] };
      mockRepo.addCard.mockResolvedValue(collection);

      const res = await request(app).post('/api/collections/1/cards').set(authHeaders).send({ cardId: 'c1' });

      expect(res.status).toBe(200);
      expect(res.body.cards).toContain('c1');
    });
  });

  describe('DELETE /api/collections/:id/cards/:cardId', () => {
    it('returns 404 when collection not found', async () => {
      mockRepo.removeCard.mockResolvedValue(null);

      const res = await request(app).delete('/api/collections/1/cards/c1').set(authHeaders);

      expect(res.status).toBe(404);
    });

    it('returns 200 and collection when card removed', async () => {
      const collection = { id: '1', cards: [] };
      mockRepo.removeCard.mockResolvedValue(collection);

      const res = await request(app).delete('/api/collections/1/cards/c1').set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('1');
    });
  });
});
