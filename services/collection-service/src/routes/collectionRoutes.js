const express = require('express');
const path = require('path');
const router = express.Router();

let CollectionRepository;

async function getRepo() {
  if (!CollectionRepository) {
    const { initPostgres } = require(path.join(__dirname, '../../../shared/postgres'));
    const { Collection, Card } = await initPostgres();
    const PostgresCollectionRepository = require(path.join(__dirname, '../../../shared/postgres/repositories/CollectionRepository'));
    CollectionRepository = new PostgresCollectionRepository(Collection, Card);
  }
  return CollectionRepository;
}

function getErrorMessage(err) {
  if (err == null) return 'Server error';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  try { return String(err); } catch (_) { return 'Server error'; }
}

function requireUser(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: 'No token provided',
      message: 'Call via API Gateway (port 8000) with Authorization: Bearer <token>.',
    });
  }
  next();
}

router.use(requireUser);

router.get('/', async (req, res) => {
  try {
    const repo = await getRepo();
    const collections = await repo.findByUser(req.user.id);
    res.json(collections);
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error('Collection service GET / error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'collection-service' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, cards, isPublic } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const repo = await getRepo();
    const collection = await repo.create({
      name: name.trim(),
      description: description != null ? String(description).trim() : '',
      cards: Array.isArray(cards) ? cards : [],
      isPublic: isPublic === true,
      userId: req.user.id,
    });
    const c = collection.toJSON ? collection.toJSON() : collection;
    c._id = c.id;
    c.cards = c.cards || [];
    res.status(201).json(c);
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error('Collection service POST / error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'collection-service' });
  }
});

router.post('/:id/cards', async (req, res) => {
  try {
    const { id } = req.params;
    const { cardId } = req.body;
    if (!cardId) return res.status(400).json({ error: 'cardId is required in body' });
    const repo = await getRepo();
    const collection = await repo.addCard(id, req.user.id, cardId);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    res.json(collection);
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error('Collection service POST /:id/cards error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'collection-service' });
  }
});

router.delete('/:id/cards/:cardId', async (req, res) => {
  try {
    const repo = await getRepo();
    const collection = await repo.removeCard(req.params.id, req.user.id, req.params.cardId);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    res.json(collection);
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error('Collection service DELETE /:id/cards/:cardId error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'collection-service' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const repo = await getRepo();
    const collection = await repo.findById(req.params.id, req.user.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    res.json(collection);
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error('Collection service GET /:id error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'collection-service' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, cards, isPublic } = req.body;
    const repo = await getRepo();
    const collection = await repo.update(req.params.id, req.user.id, {
      name: name !== undefined ? name.trim() : undefined,
      description: description !== undefined ? String(description).trim() : undefined,
      cards: Array.isArray(cards) ? cards : undefined,
      isPublic: typeof isPublic === 'boolean' ? isPublic : undefined,
    });
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    const c = await repo.findById(req.params.id, req.user.id);
    res.json(c || collection);
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error('Collection service PUT /:id error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'collection-service' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const repo = await getRepo();
    const collection = await repo.delete(req.params.id, req.user.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error('Collection service DELETE /:id error:', msg);
    res.status(error?.status || 500).json({ error: msg, message: msg, service: 'collection-service' });
  }
});

module.exports = router;
