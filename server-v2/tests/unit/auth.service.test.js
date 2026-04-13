const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserRepo = require('../../src/repositories/user.repo');
const { generateToken, generateRefreshToken } = require('../../src/middleware/auth');
const AuthService = require('../../src/services/auth.service');

jest.mock('../../src/config/db', () => {
  const fn = jest.fn();
  const chain = { where: jest.fn(), first: jest.fn(), update: jest.fn(), insert: jest.fn() };
  fn.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.first.mockResolvedValue({});
  chain.update.mockResolvedValue(1);
  chain.insert.mockResolvedValue([1]);
  fn.fn = { now: jest.fn(() => new Date()) };
  return fn;
});

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../src/repositories/user.repo');
jest.mock('../../src/middleware/auth', () => ({
  auth: jest.fn(),
  optionalAuth: jest.fn(),
  restrictTo: jest.fn(),
  generateToken: jest.fn(),
  generateRefreshToken: jest.fn(),
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_SECRET = 'test-secret';
  });

  // ── register ──────────────────────────────────────────
  describe('register', () => {
    const baseUser = {
      id: 1, username: 'alice', email: 'alice@test.com',
      password: 'hashed', nickname: 'Alice',
      settings: '{"theme":"light","autoSave":true,"autoSaveInterval":30,"editorFontSize":14}',
      status: 'active',
    };

    it('should register successfully with nickname', async () => {
      UserRepo.findByUsernameOrEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed');
      UserRepo.create.mockResolvedValue(baseUser);
      generateToken.mockReturnValue('access-token');
      generateRefreshToken.mockReturnValue('refresh-token');

      const result = await AuthService.register({
        username: 'alice', email: 'alice@test.com',
        password: '123456', nickname: 'Alice',
      });

      expect(UserRepo.findByUsernameOrEmail).toHaveBeenCalledWith('alice', 'alice@test.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 12);
      expect(UserRepo.create).toHaveBeenCalled();
      expect(result).toEqual({
        user: expect.objectContaining({ id: 1, username: 'alice' }),
        token: 'access-token',
        refreshToken: 'refresh-token',
      });
      // password should not be exposed
      expect(result.user.password).toBeUndefined();
    });

    it('should use username as nickname if not provided', async () => {
      UserRepo.findByUsernameOrEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed');
      UserRepo.create.mockResolvedValue(baseUser);
      generateToken.mockReturnValue('access-token');
      generateRefreshToken.mockReturnValue('refresh-token');

      await AuthService.register({
        username: 'bob', email: 'bob@test.com', password: '123456',
      });

      const createArg = UserRepo.create.mock.calls[0][0];
      expect(createArg.nickname).toBe('bob');
    });

    it('should throw 409 if username already exists', async () => {
      UserRepo.findByUsernameOrEmail.mockResolvedValue({
        username: 'alice', email: 'other@test.com',
      });

      await expect(
        AuthService.register({ username: 'alice', email: 'new@test.com', password: '123456' })
      ).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('用户名') });
    });

    it('should throw 409 if email already exists', async () => {
      UserRepo.findByUsernameOrEmail.mockResolvedValue({
        username: 'other', email: 'alice@test.com',
      });

      await expect(
        AuthService.register({ username: 'newuser', email: 'alice@test.com', password: '123456' })
      ).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('邮箱') });
    });
  });

  // ── login ─────────────────────────────────────────────
  describe('login', () => {
    const activeUser = {
      id: 1, username: 'alice', password: 'hashed',
      status: 'active', login_attempts: 0, lock_until: null,
    };

    it('should login successfully', async () => {
      UserRepo.findByUsernameOrEmail.mockResolvedValue(activeUser);
      UserRepo.isLocked.mockReturnValue(false);
      bcrypt.compare.mockResolvedValue(true);
      UserRepo.resetLoginAttempts.mockResolvedValue();
      generateToken.mockReturnValue('access-token');
      generateRefreshToken.mockReturnValue('refresh-token');

      const result = await AuthService.login({ username: 'alice', password: '123456' });

      expect(UserRepo.resetLoginAttempts).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        user: expect.objectContaining({ id: 1 }),
        token: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw 401 if user not found', async () => {
      UserRepo.findByUsernameOrEmail.mockResolvedValue(null);

      await expect(
        AuthService.login({ username: 'nobody', password: 'x' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should throw 401 if account is locked', async () => {
      UserRepo.findByUsernameOrEmail.mockResolvedValue(activeUser);
      UserRepo.isLocked.mockReturnValue(true);

      await expect(
        AuthService.login({ username: 'alice', password: '123456' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should throw 401 on wrong password and increment attempts', async () => {
      UserRepo.findByUsernameOrEmail.mockResolvedValue({ ...activeUser, login_attempts: 3 });
      UserRepo.isLocked.mockReturnValue(false);
      bcrypt.compare.mockResolvedValue(false);
      UserRepo.incLoginAttempts.mockResolvedValue();

      await expect(
        AuthService.login({ username: 'alice', password: 'wrong' })
      ).rejects.toMatchObject({ statusCode: 401 });

      expect(UserRepo.incLoginAttempts).toHaveBeenCalledWith(1);
    });

    it('should lock user after MAX_LOGIN_ATTEMPTS failed attempts', async () => {
      const user = { ...activeUser, login_attempts: 4 };
      UserRepo.findByUsernameOrEmail.mockResolvedValue(user);
      UserRepo.isLocked.mockReturnValue(false);
      bcrypt.compare.mockResolvedValue(false);
      UserRepo.incLoginAttempts.mockResolvedValue();
      UserRepo.lockUser.mockResolvedValue();

      await expect(
        AuthService.login({ username: 'alice', password: 'wrong' })
      ).rejects.toMatchObject({ statusCode: 401 });

      expect(UserRepo.lockUser).toHaveBeenCalledWith(1, expect.any(Date));
    });

    it('should throw 401 if user status is not active', async () => {
      UserRepo.findByUsernameOrEmail.mockResolvedValue({ ...activeUser, status: 'banned' });
      UserRepo.isLocked.mockReturnValue(false);
      bcrypt.compare.mockResolvedValue(true);

      await expect(
        AuthService.login({ username: 'alice', password: '123456' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  // ── refresh ───────────────────────────────────────────
  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      jwt.verify.mockReturnValue({ id: 1 });
      UserRepo.findById.mockResolvedValue({ id: 1, status: 'active' });
      generateToken.mockReturnValue('new-access');
      generateRefreshToken.mockReturnValue('new-refresh');

      const result = await AuthService.refresh('valid-refresh-token');

      expect(result).toEqual({ token: 'new-access', refreshToken: 'new-refresh' });
    });

    it('should throw 401 if token is invalid', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('bad token'); });

      await expect(
        AuthService.refresh('invalid-token')
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should throw 401 if user not found or inactive', async () => {
      jwt.verify.mockReturnValue({ id: 99 });
      UserRepo.findById.mockResolvedValue(null);

      await expect(
        AuthService.refresh('valid-but-no-user')
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should throw 401 if user status is not active', async () => {
      jwt.verify.mockReturnValue({ id: 1 });
      UserRepo.findById.mockResolvedValue({ id: 1, status: 'banned' });

      await expect(
        AuthService.refresh('valid-but-inactive')
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  // ── getProfile ────────────────────────────────────────
  describe('getProfile', () => {
    it('should return profile with membership and limits', async () => {
      const user = {
        id: 1, username: 'alice', email: 'a@b.com',
        nickname: 'Alice', status: 'active', role: 'user',
        avatar: null, created_at: '2025-01-01',
        settings: '{"theme":"light"}',
      };
      UserRepo.findById.mockResolvedValue(user);

      const result = await AuthService.getProfile(1);

      expect(result.id).toBe(1);
      expect(result.membership).toBeDefined();
      expect(result.limits).toBeDefined();
      expect(result.wechat).toBeNull();
    });

    it('should throw 404 if user not found', async () => {
      UserRepo.findById.mockResolvedValue(null);

      await expect(AuthService.getProfile(999)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should handle membership with endDate', async () => {
      const futureDate = new Date(Date.now() + 5 * 86400000).toISOString();
      const user = {
        id: 1, username: 'alice', email: 'a@b.com',
        nickname: 'Alice', status: 'active', role: 'user',
        avatar: null, created_at: '2025-01-01',
        settings: JSON.stringify({ membership: { type: 'pro', endDate: futureDate } }),
      };
      UserRepo.findById.mockResolvedValue(user);

      const result = await AuthService.getProfile(1);
      expect(result.membership.daysLeft).toBeGreaterThanOrEqual(4);
      expect(result.limits.documents).toBe(200);
    });

    it('should return free limits for unknown membership type', async () => {
      const user = {
        id: 1, username: 'alice', email: 'a@b.com',
        nickname: 'Alice', status: 'active', role: 'user',
        avatar: null, created_at: '2025-01-01',
        settings: JSON.stringify({ membership: { type: 'unknown_type' } }),
      };
      UserRepo.findById.mockResolvedValue(user);

      const result = await AuthService.getProfile(1);
      expect(result.limits.documents).toBe(3); // free limit
    });

    it('should return enterprise limits', async () => {
      const user = {
        id: 1, username: 'alice', email: 'a@b.com',
        nickname: 'Alice', status: 'active', role: 'user',
        avatar: null, created_at: '2025-01-01',
        settings: JSON.stringify({ membership: { type: 'enterprise' } }),
      };
      UserRepo.findById.mockResolvedValue(user);

      const result = await AuthService.getProfile(1);
      expect(result.limits.documents).toBe(-1); // unlimited
    });
  });

  // ── updateProfile ─────────────────────────────────────
  describe('updateProfile', () => {
    it('should update nickname', async () => {
      UserRepo.update.mockResolvedValue({ id: 1, nickname: 'NewName' });

      await AuthService.updateProfile(1, { nickname: 'NewName' });

      expect(UserRepo.update).toHaveBeenCalledWith(1, { nickname: 'NewName' });
    });

    it('should update avatar', async () => {
      UserRepo.update.mockResolvedValue({ id: 1, avatar: 'new.png' });

      await AuthService.updateProfile(1, { avatar: 'new.png' });

      expect(UserRepo.update).toHaveBeenCalledWith(1, { avatar: 'new.png' });
    });

    it('should update bio (merged into settings)', async () => {
      UserRepo.findById.mockResolvedValue({ id: 1, settings: '{"theme":"light"}' });
      UserRepo.update.mockResolvedValue({ id: 1 });

      await AuthService.updateProfile(1, { bio: 'Hello world' });

      expect(UserRepo.update).toHaveBeenCalledWith(1, {
        settings: JSON.stringify({ theme: 'light', bio: 'Hello world' }),
      });
    });

    it('should update phone (merged into settings)', async () => {
      UserRepo.findById.mockResolvedValue({ id: 1, settings: '{}' });
      UserRepo.update.mockResolvedValue({ id: 1 });

      await AuthService.updateProfile(1, { phone: '13800138000' });

      expect(UserRepo.update).toHaveBeenCalledWith(1, {
        settings: JSON.stringify({ phone: '13800138000' }),
      });
    });

    it('should update multiple fields at once', async () => {
      UserRepo.update.mockResolvedValue({ id: 1 });

      await AuthService.updateProfile(1, { nickname: 'New', avatar: 'pic.png' });

      expect(UserRepo.update).toHaveBeenCalledWith(1, { nickname: 'New', avatar: 'pic.png' });
    });

    it('should handle empty string settings when updating bio', async () => {
      UserRepo.findById.mockResolvedValue({ id: 1, settings: '' });
      UserRepo.update.mockResolvedValue({ id: 1 });

      // parseJSON('') tries JSON.parse('') which throws, so falls back to {}
      await AuthService.updateProfile(1, { bio: 'my bio' });

      expect(UserRepo.update).toHaveBeenCalledWith(1, {
        settings: JSON.stringify({ bio: 'my bio' }),
      });
    });
  });

  // ── changePassword ────────────────────────────────────
  describe('changePassword', () => {
    it('should change password successfully', async () => {
      UserRepo.findById.mockResolvedValue({ id: 1, password: 'old-hash' });
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('new-hash');
      UserRepo.update.mockResolvedValue();

      await AuthService.changePassword(1, { oldPassword: 'old', newPassword: 'new' });

      expect(bcrypt.hash).toHaveBeenCalledWith('new', 12);
      expect(UserRepo.update).toHaveBeenCalledWith(1, {
        password: 'new-hash',
        password_changed_at: expect.any(Date),
      });
    });

    it('should throw 404 if user not found', async () => {
      UserRepo.findById.mockResolvedValue(null);

      await expect(
        AuthService.changePassword(999, { oldPassword: 'old', newPassword: 'new' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 400 if old password is wrong', async () => {
      UserRepo.findById.mockResolvedValue({ id: 1, password: 'old-hash' });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        AuthService.changePassword(1, { oldPassword: 'wrong', newPassword: 'new' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
