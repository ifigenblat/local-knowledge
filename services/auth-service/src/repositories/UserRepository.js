const BaseRepository = require('../../../shared/repository-pattern');
const User = require('../models/User');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    return await this.findOne({ email: email.toLowerCase().trim() });
  }

  async findByIdWithRole(id) {
    return await this.model.findById(id).populate('role');
  }

  async findByEmailWithRole(email) {
    return await this.model.findOne({ email: email.toLowerCase().trim() }).populate('role');
  }

  async createUser(userData) {
    const user = new this.model(userData);
    return await user.save();
  }

  async updatePasswordResetToken(id, token, expires) {
    return await this.update(id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires
    });
  }

  async clearPasswordResetToken(id) {
    return await this.update(id, {
      resetPasswordToken: null,
      resetPasswordExpires: null
    });
  }

  async updatePassword(id, hashedPassword) {
    return await this.update(id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      mustChangePassword: false
    });
  }
}

module.exports = new UserRepository();
