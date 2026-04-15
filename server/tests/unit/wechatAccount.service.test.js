jest.mock('../../src/config/db', () => {
  const fn = jest.fn();
  const chain = { where: jest.fn(), first: jest.fn(), update: jest.fn(), insert: jest.fn(), del: jest.fn(), select: jest.fn() };
  fn.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.first.mockResolvedValue(null);
  chain.update.mockResolvedValue(1);
  chain.insert.mockResolvedValue([1]);
  chain.del.mockResolvedValue(1);
  chain.select.mockReturnValue(chain);
  return fn;
});

const WechatAccountRepo = require('../../src/repositories/wechatAccount.repo');
const WechatAccountService = require('../../src/services/wechatAccount.service');

jest.mock('../../src/repositories/wechatAccount.repo');
jest.mock('../../src/services/wechatProxy.service', () => ({
  getAccessToken: jest.fn().mockResolvedValue('mock_access_token_1234567890'),
  get: jest.fn().mockResolvedValue({ ip_list: ['127.0.0.1'] }),
  clearTokenCache: jest.fn(),
}));
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('abcdef0123456789abcdef0123456789', 'hex')),
}));

describe('WechatAccountService', () => {
  const user = { id: 1, role: 'user' };
  const adminUser = { id: 2, role: 'admin' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── list ────────────────────────────────────────────────
  describe('list', () => {
    it('should return accounts for a user', async () => {
      const accounts = [{ id: 1, nickname: 'My Account' }];
      WechatAccountRepo.listByUserId.mockResolvedValue(accounts);

      const result = await WechatAccountService.list(user);

      expect(WechatAccountRepo.listByUserId).toHaveBeenCalledWith(1);
      expect(result).toEqual(accounts);
    });
  });

  // ── create ──────────────────────────────────────────────
  describe('create', () => {
    const validData = {
      app_id: 'wx1234567890',
      app_secret: 'secret123',
      nickname: 'Test Account',
    };

    it('should create an account successfully', async () => {
      WechatAccountRepo.findByAppId.mockResolvedValue(null);
      WechatAccountRepo.create.mockResolvedValue({ id: 1, app_id: 'wx1234567890' });

      const result = await WechatAccountService.create(user, validData);

      expect(WechatAccountRepo.create).toHaveBeenCalledWith({
        user_id: 1,
        app_id: 'wx1234567890',
        app_secret: 'secret123',
        nickname: 'Test Account',
        status: 'active',
      });
      expect(result.id).toBe(1);
    });

    it('should use empty string for nickname if not provided', async () => {
      WechatAccountRepo.findByAppId.mockResolvedValue(null);
      WechatAccountRepo.create.mockResolvedValue({ id: 2 });

      await WechatAccountService.create(user, {
        app_id: 'wx123',
        app_secret: 'secret',
      });

      expect(WechatAccountRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ nickname: '' })
      );
    });

    it('should throw 400 if app_id is missing', async () => {
      await expect(
        WechatAccountService.create(user, { app_secret: 'secret' })
      ).rejects.toMatchObject({ statusCode: 400, message: 'app_id 和 app_secret 不能为空' });
    });

    it('should throw 400 if app_secret is missing', async () => {
      await expect(
        WechatAccountService.create(user, { app_id: 'wx123' })
      ).rejects.toMatchObject({ statusCode: 400, message: 'app_id 和 app_secret 不能为空' });
    });

    it('should throw 409 if account already added by same user', async () => {
      WechatAccountRepo.findByAppId.mockResolvedValue({ id: 1, user_id: 1 });

      await expect(
        WechatAccountService.create(user, validData)
      ).rejects.toMatchObject({ statusCode: 409, message: '该公众号已添加' });
    });

    it('should allow creating if app_id exists but belongs to another user', async () => {
      WechatAccountRepo.findByAppId.mockResolvedValue({ id: 1, user_id: 99 });
      WechatAccountRepo.create.mockResolvedValue({ id: 2 });

      const result = await WechatAccountService.create(user, validData);
      expect(result.id).toBe(2);
    });
  });

  // ── update ──────────────────────────────────────────────
  describe('update', () => {
    it('should update allowed fields', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      WechatAccountRepo.update.mockResolvedValue({ id: 1, nickname: 'New Name' });

      const result = await WechatAccountService.update(user, 1, {
        nickname: 'New Name',
        avatar: 'new_avatar.png',
      });

      expect(WechatAccountRepo.update).toHaveBeenCalledWith(1, {
        nickname: 'New Name',
        avatar: 'new_avatar.png',
      });
    });

    it('should only update fields that are provided', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      WechatAccountRepo.update.mockResolvedValue({ id: 1 });

      await WechatAccountService.update(user, 1, { nickname: 'Only' });

      expect(WechatAccountRepo.update).toHaveBeenCalledWith(1, { nickname: 'Only' });
    });

    it('should allow updating status and app credentials', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 1, user_id: 1, app_id: 'old_id' });
      WechatAccountRepo.update.mockResolvedValue({ id: 1 });
      const WechatProxyService = require('../../src/services/wechatProxy.service');

      await WechatAccountService.update(user, 1, {
        status: 'inactive',
        app_id: 'new_id',
        app_secret: 'new_secret',
      });

      expect(WechatAccountRepo.update).toHaveBeenCalledWith(1, {
        status: 'inactive',
        app_id: 'new_id',
        app_secret: 'new_secret',
        verified: false,
      });
      expect(WechatProxyService.clearTokenCache).toHaveBeenCalledWith('new_id');
    });

    it('should throw 404 if account not found', async () => {
      WechatAccountRepo.findById.mockResolvedValue(null);

      await expect(
        WechatAccountService.update(user, 999, { nickname: 'X' })
      ).rejects.toMatchObject({ statusCode: 404, message: '公众号不存在' });
    });

    it('should throw 403 if user does not own the account', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });

      await expect(
        WechatAccountService.update(user, 1, { nickname: 'X' })
      ).rejects.toMatchObject({ statusCode: 403, message: '无权修改此公众号' });
    });

    it('should allow admin to update any account', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });
      WechatAccountRepo.update.mockResolvedValue({ id: 1 });

      const result = await WechatAccountService.update(adminUser, 1, { nickname: 'Admin Edit' });
      expect(result).toBeDefined();
    });
  });

  // ── remove ──────────────────────────────────────────────
  describe('remove', () => {
    it('should delete an account', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      WechatAccountRepo.delete.mockResolvedValue();

      await WechatAccountService.remove(user, 1);

      expect(WechatAccountRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw 404 if account not found', async () => {
      WechatAccountRepo.findById.mockResolvedValue(null);

      await expect(
        WechatAccountService.remove(user, 999)
      ).rejects.toMatchObject({ statusCode: 404, message: '公众号不存在' });
    });

    it('should throw 403 if user does not own the account', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });

      await expect(
        WechatAccountService.remove(user, 1)
      ).rejects.toMatchObject({ statusCode: 403, message: '无权删除此公众号' });
    });

    it('should allow admin to delete any account', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });
      WechatAccountRepo.delete.mockResolvedValue();

      await WechatAccountService.remove(adminUser, 1);
      expect(WechatAccountRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  // ── verify ──────────────────────────────────────────────
  describe('verify', () => {
    it('should verify an account successfully', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 1, user_id: 1, app_id: 'wx123', app_secret: 'secret' });
      WechatAccountRepo.update.mockResolvedValue({ id: 1 });

      const result = await WechatAccountService.verify(user, 1);

      expect(result).toEqual({ success: true, message: '公众号验证成功' });
      expect(WechatAccountRepo.update).toHaveBeenCalledWith(1, {
        verified: true,
        status: 'active',
        token_info: expect.any(String),
      });

      const tokenInfo = JSON.parse(WechatAccountRepo.update.mock.calls[0][1].token_info);
      expect(tokenInfo.access_token_preview).toMatch(/^mock_acce/);
      expect(tokenInfo.verified_at).toBeDefined();
    });

    it('should throw 404 if account not found', async () => {
      WechatAccountRepo.findById.mockResolvedValue(null);

      await expect(
        WechatAccountService.verify(user, 999)
      ).rejects.toMatchObject({ statusCode: 404, message: '公众号不存在' });
    });

    it('should throw 403 if user does not own the account', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });

      await expect(
        WechatAccountService.verify(user, 1)
      ).rejects.toMatchObject({ statusCode: 403, message: '无权操作此公众号' });
    });

    it('should handle verification failure gracefully', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 1, user_id: 1, app_id: 'wx123', app_secret: 'secret' });
      WechatAccountRepo.update.mockResolvedValue({ id: 1 });
      const WechatProxyService = require('../../src/services/wechatProxy.service');
      WechatProxyService.getAccessToken.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        WechatAccountService.verify(user, 1)
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('公众号验证失败') });

      expect(WechatAccountRepo.update).toHaveBeenCalledTimes(2);
      expect(WechatAccountRepo.update).toHaveBeenNthCalledWith(2, 1, {
        verified: false,
        status: 'inactive',
      });
    });

    it('should allow admin to verify any account', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 1, user_id: 99, app_id: 'wx123', app_secret: 'secret' });
      WechatAccountRepo.update.mockResolvedValue({ id: 1 });

      const result = await WechatAccountService.verify(adminUser, 1);
      expect(result.success).toBe(true);
    });
  });
});
