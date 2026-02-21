const request = require('supertest');

jest.mock('../src/repositories/CardRepositoryFactory', () => ({ getCardRepository: jest.fn() }));
jest.mock('../src/services/CardService');

const CardService = require('../src/services/CardService');
const app = require('../src/index.js');

const authHeaders = { 'x-user-id': 'user-1', 'x-user-email': 'u@t.com' };

describe('cardRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/cards', () => {
    it('returns 401 when no user', async () => {
      const res = await request(app).get('/api/cards');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('No token');
    });

    it('returns 200 and cards when user present', async () => {
      CardService.getCards.mockResolvedValue({
        cards: [{ id: '1', title: 'C1' }],
        pagination: { current: 1, total: 1, totalCount: 1 },
      });

      const res = await request(app).get('/api/cards').set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.cards).toHaveLength(1);
      expect(res.body.pagination.totalCount).toBe(1);
    });
  });

  describe('GET /api/cards/category/:category', () => {
    it('returns 200 and cards array', async () => {
      CardService.getCards.mockResolvedValue({ cards: [{ id: '1', category: 'General' }], pagination: {} });

      const res = await request(app).get('/api/cards/category/General').set(authHeaders);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].category).toBe('General');
    });
  });

  describe('GET /api/cards/type/:type', () => {
    it('returns 200 and cards array', async () => {
      CardService.getCards.mockResolvedValue({ cards: [{ id: '1', type: 'concept' }], pagination: {} });

      const res = await request(app).get('/api/cards/type/concept').set(authHeaders);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].type).toBe('concept');
    });
  });

  describe('GET /api/cards/:id', () => {
    it('returns 404 when card not found', async () => {
      CardService.getCardByIdOrCardId.mockResolvedValue(null);

      const res = await request(app).get('/api/cards/1').set(authHeaders);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('returns 200 and card when found', async () => {
      const card = { id: '1', title: 'C1' };
      CardService.getCardByIdOrCardId.mockResolvedValue(card);

      const res = await request(app).get('/api/cards/1').set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('C1');
    });
  });

  describe('POST /api/cards', () => {
    it('returns 400 when title, content or category missing', async () => {
      const res = await request(app)
        .post('/api/cards')
        .set(authHeaders)
        .send({ title: 'T', content: 'C' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('returns 201 and card when created', async () => {
      const created = { id: '1', title: 'T', content: 'C', category: 'Gen' };
      CardService.createCard.mockResolvedValue(created);

      const res = await request(app)
        .post('/api/cards')
        .set(authHeaders)
        .send({ title: 'T', content: 'C', category: 'Gen' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('T');
      expect(CardService.createCard).toHaveBeenCalledWith('user-1', expect.objectContaining({ title: 'T', content: 'C', category: 'Gen' }));
    });
  });

  describe('PUT /api/cards/:id', () => {
    it('returns 404 when card not found', async () => {
      CardService.updateCard.mockResolvedValue(null);

      const res = await request(app).put('/api/cards/1').set(authHeaders).send({ title: 'New' });

      expect(res.status).toBe(404);
    });

    it('returns 200 and card when updated', async () => {
      const updated = { id: '1', title: 'New' };
      CardService.updateCard.mockResolvedValue(updated);

      const res = await request(app).put('/api/cards/1').set(authHeaders).send({ title: 'New' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New');
    });
  });

  describe('DELETE /api/cards/:id', () => {
    it('returns 404 when card not found', async () => {
      CardService.deleteCard.mockResolvedValue(null);

      const res = await request(app).delete('/api/cards/1').set(authHeaders);

      expect(res.status).toBe(404);
    });

    it('returns 200 and message when deleted', async () => {
      CardService.deleteCard.mockResolvedValue({ id: '1' });

      const res = await request(app).delete('/api/cards/1').set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });
  });

  describe('PATCH /api/cards/:id/review', () => {
    it('returns 404 when card not found', async () => {
      CardService.updateReview.mockResolvedValue(null);

      const res = await request(app).patch('/api/cards/1/review').set(authHeaders);

      expect(res.status).toBe(404);
    });

    it('returns 200 and card when updated', async () => {
      const card = { id: '1' };
      CardService.updateReview.mockResolvedValue(card);

      const res = await request(app).patch('/api/cards/1/review').set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('1');
    });
  });

  describe('PATCH /api/cards/:id/rate', () => {
    it('returns 400 when rating invalid', async () => {
      const res = await request(app).patch('/api/cards/1/rate').set(authHeaders).send({ rating: 10 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('1 and 5');
    });

    it('returns 404 when card not found', async () => {
      CardService.updateRating.mockResolvedValue(null);

      const res = await request(app).patch('/api/cards/1/rate').set(authHeaders).send({ rating: 4 });

      expect(res.status).toBe(404);
    });

    it('returns 200 and card when rated', async () => {
      const card = { id: '1', metadata: { rating: 4 } };
      CardService.updateRating.mockResolvedValue(card);

      const res = await request(app).patch('/api/cards/1/rate').set(authHeaders).send({ rating: 4 });

      expect(res.status).toBe(200);
      expect(res.body.metadata.rating).toBe(4);
    });
  });
});
