const UserService = require('../src/services/UserService');
const { getUserRepository } = require('../src/repositories/UserRepositoryFactory');
const axios = require('axios');

jest.mock('../src/repositories/UserRepositoryFactory');
jest.mock('axios');

describe('UserService', () => {
  let mockRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      findAllWithRole: jest.fn(),
      count: jest.fn(),
      findByIdWithRole: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      delete: jest.fn(),
    };
    getUserRepository.mockResolvedValue(mockRepo);
  });

  describe('getAllUsers', () => {
    it('returns users and total from repository', async () => {
      mockRepo.findAllWithRole.mockResolvedValue([{ id: '1', name: 'Alice' }]);
      mockRepo.count.mockResolvedValue(1);

      const result = await UserService.getAllUsers({}, { limit: 10, skip: 0 });

      expect(getUserRepository).toHaveBeenCalled();
      expect(mockRepo.findAllWithRole).toHaveBeenCalledWith({}, expect.any(Object));
      expect(mockRepo.count).toHaveBeenCalledWith({});
      expect(result).toEqual({ users: [{ id: '1', name: 'Alice' }], total: 1 });
    });
  });

  describe('getUserById', () => {
    it('returns user when found', async () => {
      const user = { id: '1', name: 'Alice', email: 'a@test.com' };
      mockRepo.findByIdWithRole.mockResolvedValue(user);

      const result = await UserService.getUserById('1');

      expect(mockRepo.findByIdWithRole).toHaveBeenCalledWith('1');
      expect(result).toEqual(user);
    });

    it('throws when user not found', async () => {
      mockRepo.findByIdWithRole.mockResolvedValue(null);

      await expect(UserService.getUserById('999')).rejects.toThrow('User not found');
    });
  });

  describe('createUser', () => {
    it('creates user without roleId and password', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.createUser.mockResolvedValue({ id: '1', name: 'Bob', email: 'b@test.com' });
      mockRepo.findByIdWithRole.mockResolvedValue({ id: '1', name: 'Bob', email: 'b@test.com' });

      const result = await UserService.createUser({ name: 'Bob', email: 'b@test.com' });

      expect(mockRepo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Bob', email: 'b@test.com', password: undefined, role: null })
      );
      expect(result).toEqual({ id: '1', name: 'Bob', email: 'b@test.com' });
    });

    it('throws when email already exists', async () => {
      mockRepo.findByEmail.mockResolvedValue({ id: '1', email: 'b@test.com' });

      await expect(
        UserService.createUser({ name: 'Bob', email: 'b@test.com', password: 'secret' })
      ).rejects.toThrow('User with this email already exists');
    });

    it('validates roleId and throws when invalid', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(
        UserService.createUser({ name: 'Bob', email: 'b@test.com', roleId: 'bad-role' })
      ).rejects.toThrow('Invalid role ID');
    });

    it('hashes password and creates user with roleId', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      axios.get.mockResolvedValue({ data: { id: 'r1' } });
      mockRepo.createUser.mockResolvedValue({ id: '1', name: 'Bob', email: 'b@test.com' });
      mockRepo.findByIdWithRole.mockResolvedValue({ id: '1', name: 'Bob', email: 'b@test.com' });

      const result = await UserService.createUser({
        name: 'Bob',
        email: 'b@test.com',
        password: 'secret',
        roleId: 'r1',
      });

      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/roles/r1'));
      expect(mockRepo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Bob',
          email: 'b@test.com',
          role: 'r1',
        })
      );
      expect(mockRepo.createUser.mock.calls[0][0].password).not.toBe('secret');
      expect(result.name).toBe('Bob');
    });
  });

  describe('updateUser', () => {
    it('throws when user not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(UserService.updateUser('999', { name: 'X' })).rejects.toThrow('User not found');
    });

    it('updates user and returns result', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1' });
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.updateUser.mockResolvedValue({ id: '1', name: 'Alice Updated', email: 'a@test.com' });

      const result = await UserService.updateUser('1', { name: 'Alice Updated' });

      expect(mockRepo.updateUser).toHaveBeenCalledWith('1', { name: 'Alice Updated' });
      expect(result.name).toBe('Alice Updated');
    });

    it('throws when email already in use by another user', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1' });
      mockRepo.findByEmail.mockResolvedValue({ id: '2', email: 'other@test.com' });

      await expect(
        UserService.updateUser('1', { email: 'other@test.com' })
      ).rejects.toThrow('Email already in use');
    });

    it('validates roleId and throws when invalid', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1' });
      axios.get.mockRejectedValue({ response: { status: 404 } });

      await expect(
        UserService.updateUser('1', { roleId: 'bad' })
      ).rejects.toThrow('Invalid role ID');
    });

    it('hashes new password when provided', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1' });
      mockRepo.updateUser.mockResolvedValue({ id: '1', name: 'Alice' });

      await UserService.updateUser('1', { password: 'newpass' });

      expect(mockRepo.updateUser).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ password: expect.any(String) })
      );
      expect(mockRepo.updateUser.mock.calls[0][0].password).not.toBe('newpass');
    });
  });

  describe('deleteUser', () => {
    it('throws when user not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(UserService.deleteUser('999')).rejects.toThrow('User not found');
    });

    it('deletes user when found', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1' });
      mockRepo.delete.mockResolvedValue(undefined);

      await UserService.deleteUser('1');

      expect(mockRepo.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('assignRoleToUser', () => {
    it('throws when roleId missing', async () => {
      await expect(
        UserService.assignRoleToUser('u1', null, 'admin')
      ).rejects.toThrow('Role ID is required');
    });

    it('throws when role not found (404)', async () => {
      axios.get.mockRejectedValue({ response: { status: 404 } });

      await expect(
        UserService.assignRoleToUser('u1', 'r1', 'admin')
      ).rejects.toThrow('Role not found');
    });

    it('throws when role is inactive', async () => {
      axios.get.mockResolvedValue({ data: { id: 'r1', isActive: false } });

      await expect(
        UserService.assignRoleToUser('u1', 'r1', 'admin')
      ).rejects.toThrow('Cannot assign inactive role');
    });

    it('throws when user not found', async () => {
      axios.get.mockResolvedValue({ data: { id: 'r1', isActive: true } });
      mockRepo.findByIdWithRole.mockResolvedValue(null);

      await expect(
        UserService.assignRoleToUser('u1', 'r1', 'admin')
      ).rejects.toThrow('User not found');
    });

    it('throws when non-superadmin tries to modify superadmin user role', async () => {
      axios.get.mockResolvedValue({ data: { id: 'r1', isActive: true } });
      mockRepo.findByIdWithRole.mockResolvedValue({
        id: 'u1',
        Role: { name: 'superadmin' },
      });

      await expect(
        UserService.assignRoleToUser('u1', 'r1', 'admin')
      ).rejects.toThrow('Cannot modify superadmin user role');
    });

    it('allows superadmin to assign role to superadmin user', async () => {
      axios.get.mockResolvedValue({ data: { id: 'r1', isActive: true } });
      mockRepo.findByIdWithRole.mockResolvedValue({
        id: 'u1',
        Role: { name: 'superadmin' },
      });
      mockRepo.updateUser.mockResolvedValue({ id: 'u1', roleId: 'r1' });

      const result = await UserService.assignRoleToUser('u1', 'r1', 'superadmin');

      expect(mockRepo.updateUser).toHaveBeenCalledWith('u1', { roleId: 'r1' });
      expect(result).toEqual({ id: 'u1', roleId: 'r1' });
    });

    it('assigns role and returns updated user', async () => {
      axios.get.mockResolvedValue({ data: { id: 'r1', isActive: true } });
      mockRepo.findByIdWithRole.mockResolvedValue({ id: 'u1', Role: { name: 'user' } });
      mockRepo.updateUser.mockResolvedValue({ id: 'u1', roleId: 'r1' });

      const result = await UserService.assignRoleToUser('u1', 'r1', 'admin');

      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/roles/r1'));
      expect(mockRepo.updateUser).toHaveBeenCalledWith('u1', { roleId: 'r1' });
      expect(result).toEqual({ id: 'u1', roleId: 'r1' });
    });
  });
});
