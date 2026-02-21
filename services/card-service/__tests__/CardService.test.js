const CardService = require('../src/services/CardService');
const { getCardRepository } = require('../src/repositories/CardRepositoryFactory');

jest.mock('../src/repositories/CardRepositoryFactory');

describe('CardService', () => {
  let mockRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      findByUser: jest.fn(),
      countByUser: jest.fn(),
      countAll: jest.fn(),
      findByCardId: jest.fn(),
      findOneByUser: jest.fn(),
      create: jest.fn(),
      deleteByUser: jest.fn(),
      findDuplicate: jest.fn(),
      updateCard: jest.fn(),
    };
    getCardRepository.mockResolvedValue(mockRepo);
  });

  describe('getCards', () => {
    it('throws when userId missing', async () => {
      await expect(CardService.getCards(null, {})).rejects.toThrow('Invalid user id');
    });

    it('returns cards and pagination', async () => {
      mockRepo.findByUser.mockResolvedValue([{ id: '1', title: 'C1' }]);
      mockRepo.countByUser.mockResolvedValue(1);

      const result = await CardService.getCards('user-1', { page: 1, limit: 20 });

      expect(result.cards).toHaveLength(1);
      expect(result.pagination.totalCount).toBe(1);
      expect(result.pagination.current).toBe(1);
    });
  });

  describe('getCardsCount', () => {
    it('throws when userId missing', async () => {
      await expect(CardService.getCardsCount(null)).rejects.toThrow('Invalid user id');
    });

    it('returns count from repository', async () => {
      mockRepo.countByUser.mockResolvedValue(42);

      const count = await CardService.getCardsCount('user-1', { type: 'concept' });

      expect(count).toBe(42);
    });
  });

  describe('getTotalCardsCount', () => {
    it('returns countAll from repository', async () => {
      mockRepo.countAll.mockResolvedValue(100);

      const count = await CardService.getTotalCardsCount();

      expect(count).toBe(100);
    });
  });

  describe('getCardByIdOrCardId', () => {
    it('finds by short cardId when 6-char alphanumeric', async () => {
      const card = { id: '1', userId: 'u1', isPublic: false };
      mockRepo.findByCardId.mockResolvedValue(card);

      const result = await CardService.getCardByIdOrCardId('ABC123', 'u1');

      expect(mockRepo.findByCardId).toHaveBeenCalledWith('ABC123');
      expect(result).toEqual(card);
    });

    it('returns null when card owner differs and not public', async () => {
      mockRepo.findByCardId.mockResolvedValue({ userId: 'other', isPublic: false });

      const result = await CardService.getCardByIdOrCardId('ABC123', 'u1');

      expect(result).toBeNull();
    });

    it('uses findOneByUser for non-cardId id', async () => {
      const card = { id: 'uuid-1' };
      mockRepo.findOneByUser.mockResolvedValue(card);

      const result = await CardService.getCardByIdOrCardId('uuid-1', 'u1');

      expect(mockRepo.findOneByUser).toHaveBeenCalledWith('uuid-1', 'u1');
      expect(result).toEqual(card);
    });
  });

  describe('createCard', () => {
    it('creates with defaults', async () => {
      const created = { id: '1', title: 'T', content: 'C', category: 'Gen' };
      mockRepo.create.mockResolvedValue(created);

      const result = await CardService.createCard('u1', {
        title: 'T',
        content: 'C',
        category: 'Gen',
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'T',
          content: 'C',
          category: 'Gen',
          user: 'u1',
          userId: 'u1',
          tags: [],
          source: '',
          isPublic: false,
          generatedBy: 'rule-based',
        })
      );
      expect(result).toEqual(created);
    });

    it('includes provenance and generatedBy when provided', async () => {
      const created = { id: '1' };
      mockRepo.create.mockResolvedValue(created);
      const provenance = { location: 'p1', snippet: 's1' };

      await CardService.createCard('u1', {
        title: 'T',
        content: 'C',
        category: 'Gen',
        provenance,
        generatedBy: 'ai',
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provenance,
          generatedBy: 'ai',
        })
      );
    });
  });

  describe('updateCard', () => {
    it('returns null when card not found', async () => {
      mockRepo.findOneByUser.mockResolvedValue(null);

      const result = await CardService.updateCard('id', 'u1', { title: 'New' });

      expect(result).toBeNull();
    });

    it('updates and returns card when found', async () => {
      const card = {
        id: '1',
        title: 'Old',
        content: 'C',
        provenance: {},
        save: jest.fn().mockResolvedValue(undefined),
        toJSON: jest.fn().mockReturnValue({ id: '1', title: 'New' }),
      };
      mockRepo.findOneByUser.mockResolvedValue(card);

      const result = await CardService.updateCard('1', 'u1', { title: 'New' });

      expect(card.title).toBe('New');
      expect(card.save).toHaveBeenCalled();
      expect(result).toEqual(card);
    });

    it('merges provenance when provided', async () => {
      const card = {
        id: '1',
        title: 'T',
        content: 'C',
        provenance: { a: 1 },
        save: jest.fn().mockResolvedValue(undefined),
        toJSON: jest.fn().mockReturnValue({}),
      };
      mockRepo.findOneByUser.mockResolvedValue(card);

      await CardService.updateCard('1', 'u1', { provenance: { b: 2 } });

      expect(card.provenance).toEqual({ a: 1, b: 2 });
    });
  });

  describe('deleteCard', () => {
    it('delegates to repository', async () => {
      mockRepo.deleteByUser.mockResolvedValue({ id: '1' });

      const result = await CardService.deleteCard('1', 'u1');

      expect(mockRepo.deleteByUser).toHaveBeenCalledWith('1', 'u1');
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('updateReview', () => {
    it('returns null when card not found', async () => {
      mockRepo.findOneByUser.mockResolvedValue(null);

      const result = await CardService.updateReview('1', 'u1');

      expect(result).toBeNull();
    });

    it('increments review and returns card', async () => {
      const card = {
        id: '1',
        metadata: {},
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockRepo.findOneByUser.mockResolvedValue(card);

      const result = await CardService.updateReview('1', 'u1');

      expect(card.metadata.lastReviewed).toBeDefined();
      expect(card.metadata.reviewCount).toBe(1);
      expect(result).toEqual(card);
    });
  });

  describe('updateRating', () => {
    it('returns null when card not found', async () => {
      mockRepo.findOneByUser.mockResolvedValue(null);

      const result = await CardService.updateRating('1', 'u1', 4);

      expect(result).toBeNull();
    });

    it('sets rating and returns card', async () => {
      const card = { id: '1', metadata: {}, save: jest.fn().mockResolvedValue(undefined) };
      mockRepo.findOneByUser.mockResolvedValue(card);

      const result = await CardService.updateRating('1', 'u1', 4);

      expect(card.metadata.rating).toBe(4);
      expect(result).toEqual(card);
    });
  });

  describe('generateContentHash', () => {
    it('returns sha256 hex string', () => {
      const hash = CardService.generateContentHash('Title', 'Content');
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('createOrUpdateFromProcessedItem', () => {
    const file = {
      filename: 'f.pdf',
      originalname: 'orig.pdf',
      path: '/tmp/f',
      mimetype: 'application/pdf',
      size: 100,
    };

    it('creates new card when no duplicate', async () => {
      mockRepo.findDuplicate.mockResolvedValue(null);
      const created = { id: '1', title: 'T', content: 'C' };
      mockRepo.create.mockResolvedValue(created);

      const result = await CardService.createOrUpdateFromProcessedItem(
        { title: 'T', content: 'C', type: 'concept', category: 'Gen' },
        'u1',
        file,
        'hash123',
        'fileId'
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.card).toEqual(created);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'T',
          content: 'C',
          user: 'u1',
          userId: 'u1',
          source: 'orig.pdf',
        })
      );
    });

    it('updates existing card when duplicate found', async () => {
      const existing = {
        id: '1',
        source: 'old.pdf',
        provenance: {},
        user: 'u1',
      };
      mockRepo.findDuplicate.mockResolvedValue(existing);
      const updated = { id: '1', source: 'old.pdf, orig.pdf' };
      mockRepo.updateCard.mockResolvedValue(updated);

      const result = await CardService.createOrUpdateFromProcessedItem(
        { title: 'T', content: 'C', generatedBy: 'ai' },
        'u1',
        file,
        'hash',
        'fid'
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.card).toEqual(updated);
      expect(mockRepo.updateCard).toHaveBeenCalledWith(
        existing,
        expect.objectContaining({
          source: 'old.pdf, orig.pdf',
          attachments: [expect.objectContaining({ filename: 'f.pdf' })],
        })
      );
    });

    it('does not overwrite provenance when existing card has it', async () => {
      const existing = {
        id: '1',
        source: 'old.pdf',
        provenance: { source_file_id: 'existing' },
        user: 'u1',
      };
      mockRepo.findDuplicate.mockResolvedValue(existing);
      mockRepo.updateCard.mockResolvedValue(existing);

      await CardService.createOrUpdateFromProcessedItem(
        { title: 'T', content: 'C' },
        'u1',
        file,
        'h',
        'fid'
      );

      const updatePayload = mockRepo.updateCard.mock.calls[0][1];
      expect(updatePayload.provenance).toBeUndefined();
    });
  });
});
