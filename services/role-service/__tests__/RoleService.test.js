const RoleService = require('../src/services/RoleService');
const { getRoleRepository } = require('../src/repositories/RoleRepositoryFactory');

jest.mock('../src/repositories/RoleRepositoryFactory');

describe('RoleService', () => {
  let mockRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      find: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    getRoleRepository.mockResolvedValue(mockRepo);
  });

  describe('getAllRoles', () => {
    it('returns all roles from repository', async () => {
      mockRepo.find.mockResolvedValue([{ id: '1', name: 'admin' }]);

      const result = await RoleService.getAllRoles();

      expect(getRoleRepository).toHaveBeenCalled();
      expect(mockRepo.find).toHaveBeenCalled();
      expect(result).toEqual([{ id: '1', name: 'admin' }]);
    });
  });

  describe('getRoleById', () => {
    it('returns role when found', async () => {
      const role = { id: '1', name: 'admin' };
      mockRepo.findById.mockResolvedValue(role);

      const result = await RoleService.getRoleById('1');

      expect(mockRepo.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(role);
    });

    it('throws when role not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(RoleService.getRoleById('999')).rejects.toThrow('Role not found');
    });
  });

  describe('getRoleByName', () => {
    it('returns role from repository', async () => {
      mockRepo.findByName.mockResolvedValue({ id: '1', name: 'admin' });

      const result = await RoleService.getRoleByName('admin');

      expect(mockRepo.findByName).toHaveBeenCalledWith('admin');
      expect(result).toEqual({ id: '1', name: 'admin' });
    });
  });

  describe('createRole', () => {
    it('creates role when name is unique', async () => {
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: '1', name: 'editor' });

      const result = await RoleService.createRole({ name: 'editor', displayName: 'Editor' });

      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'editor', displayName: 'Editor' });
      expect(result).toEqual({ id: '1', name: 'editor' });
    });

    it('throws when name already exists', async () => {
      mockRepo.findByName.mockResolvedValue({ id: '1', name: 'editor' });

      await expect(
        RoleService.createRole({ name: 'editor', displayName: 'Editor' })
      ).rejects.toThrow('Role with this name already exists');
    });
  });

  describe('updateRole', () => {
    it('updates role when found and not immutable', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', name: 'editor', isImmutable: false });
      mockRepo.update.mockResolvedValue({ id: '1', name: 'editor', displayName: 'Editor Updated' });

      const result = await RoleService.updateRole('1', { displayName: 'Editor Updated' });

      expect(mockRepo.update).toHaveBeenCalledWith('1', { displayName: 'Editor Updated' });
      expect(result.displayName).toBe('Editor Updated');
    });

    it('throws when role not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(RoleService.updateRole('999', {})).rejects.toThrow('Role not found');
    });

    it('throws when role is immutable', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', name: 'admin', isImmutable: true });

      await expect(RoleService.updateRole('1', { displayName: 'X' })).rejects.toThrow(
        'Cannot modify an immutable role'
      );
    });
  });

  describe('deleteRole', () => {
    it('deletes role when found, not immutable, not system', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', name: 'editor', isImmutable: false, isSystem: false });
      mockRepo.delete.mockResolvedValue(undefined);

      await RoleService.deleteRole('1');

      expect(mockRepo.delete).toHaveBeenCalledWith('1');
    });

    it('throws when role not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(RoleService.deleteRole('999')).rejects.toThrow('Role not found');
    });

    it('throws when role is immutable', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', isImmutable: true });

      await expect(RoleService.deleteRole('1')).rejects.toThrow('Cannot delete an immutable role');
    });

    it('throws when role is system', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', isImmutable: false, isSystem: true });

      await expect(RoleService.deleteRole('1')).rejects.toThrow('Cannot delete system role');
    });
  });
});
