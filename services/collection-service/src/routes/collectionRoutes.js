const express = require('express');
const mongoose = require('mongoose');
const Collection = require('../models/Collection');

const router = express.Router();

function getErrorMessage(err) {
  if (err == null) return 'Server error';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  if (err.code) return `Error: ${err.code}`;
  try { return String(err); } catch (_) { return 'Server error'; }
}

function requireUser(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: 'No token provided',
      message: 'Call via API Gateway (port 8000) with Authorization: Bearer <token>.'
    });
  }
  next();
}

router.use(requireUser);

function toObjectId(id) {
  if (id instanceof mongoose.Types.ObjectId) return id;
  const str = String(id).trim();
  if (/^[a-fA-F0-9]{24}$/.test(str)) return new mongoose.Types.ObjectId(str);
  throw new Error('Invalid id');
}

// List collections for user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const collections = await Collection.find({ user: userId })
      .populate('cards', 'title type category')
      .sort({ createdAt: -1 })
      .lean();
    res.json(collections);
  } catch (error) {
    const msg = error?.name === 'CastError' ? 'Invalid id format' : getErrorMessage(error);
    console.error('Collection service GET / error:', msg);
    res.status(error?.status || 500).json({
      error: msg,
      message: msg,
      service: 'collection-service'
    });
  }
});

// Create collection
router.post('/', async (req, res) => {
  try {
    const { name, description, cards, isPublic } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const userId = req.user.id;
    const collection = new Collection({
      name: name.trim(),
      description: description != null ? String(description).trim() : '',
      cards: Array.isArray(cards) ? cards : [],
      isPublic: isPublic === true,
      user: userId
    });
    await collection.save();
    res.status(201).json(collection);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    const msg = getErrorMessage(error);
    console.error('Collection service POST / error:', msg);
    res.status(error?.status || 500).json({
      error: msg,
      message: msg,
      service: 'collection-service'
    });
  }
});

// Add card to collection (before GET /:id)
router.post('/:id/cards', async (req, res) => {
  try {
    const collectionId = req.params.id;
    const { cardId } = req.body;
    if (!cardId) {
      return res.status(400).json({ error: 'cardId is required in body' });
    }
    const uid = toObjectId(req.user.id);
    const cid = toObjectId(collectionId);
    const cardObjId = toObjectId(cardId);
    const collection = await Collection.findOne({ _id: cid, user: uid });
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    const cardIdStr = cardObjId.toString();
    if (!collection.cards.some(c => c.toString() === cardIdStr)) {
      collection.cards.push(cardObjId);
      await collection.save();
    }
    await collection.populate('cards', 'title type category');
    res.json(collection);
  } catch (error) {
    const msg = error?.name === 'CastError' ? 'Invalid id format' : getErrorMessage(error);
    console.error('Collection service POST /:id/cards error:', msg);
    res.status(error?.status || 500).json({
      error: msg,
      message: msg,
      service: 'collection-service'
    });
  }
});

// Remove card from collection
router.delete('/:id/cards/:cardId', async (req, res) => {
  try {
    const uid = toObjectId(req.user.id);
    const cid = toObjectId(req.params.id);
    const cardId = req.params.cardId;
    const collection = await Collection.findOne({ _id: cid, user: uid });
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    collection.cards = collection.cards.filter(c => c.toString() !== cardId);
    await collection.save();
    await collection.populate('cards', 'title type category');
    res.json(collection);
  } catch (error) {
    const msg = error?.name === 'CastError' ? 'Invalid id format' : getErrorMessage(error);
    console.error('Collection service DELETE /:id/cards/:cardId error:', msg);
    res.status(error?.status || 500).json({
      error: msg,
      message: msg,
      service: 'collection-service'
    });
  }
});

// Get single collection
router.get('/:id', async (req, res) => {
  try {
    const uid = toObjectId(req.user.id);
    const cid = toObjectId(req.params.id);
    const collection = await Collection.findOne({ _id: cid, user: uid })
      .populate('cards')
      .lean();
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    res.json(collection);
  } catch (error) {
    const msg = error?.name === 'CastError' ? 'Invalid id format' : getErrorMessage(error);
    console.error('Collection service GET /:id error:', msg);
    res.status(error?.status || 500).json({
      error: msg,
      message: msg,
      service: 'collection-service'
    });
  }
});

// Update collection
router.put('/:id', async (req, res) => {
  try {
    const { name, description, cards, isPublic } = req.body;
    const uid = toObjectId(req.user.id);
    const cid = toObjectId(req.params.id);
    const collection = await Collection.findOne({ _id: cid, user: uid });
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    if (name !== undefined) collection.name = name.trim();
    if (description !== undefined) collection.description = String(description).trim();
    if (Array.isArray(cards)) collection.cards = cards;
    if (typeof isPublic === 'boolean') collection.isPublic = isPublic;
    await collection.save();
    await collection.populate('cards', 'title type category');
    res.json(collection);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    const msg = error?.name === 'CastError' ? 'Invalid id format' : getErrorMessage(error);
    console.error('Collection service PUT /:id error:', msg);
    res.status(error?.status || 500).json({
      error: msg,
      message: msg,
      service: 'collection-service'
    });
  }
});

// Delete collection
router.delete('/:id', async (req, res) => {
  try {
    const uid = toObjectId(req.user.id);
    const cid = toObjectId(req.params.id);
    const collection = await Collection.findOneAndDelete({ _id: cid, user: uid });
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    const msg = error?.name === 'CastError' ? 'Invalid id format' : getErrorMessage(error);
    console.error('Collection service DELETE /:id error:', msg);
    res.status(error?.status || 500).json({
      error: msg,
      message: msg,
      service: 'collection-service'
    });
  }
});

module.exports = router;
