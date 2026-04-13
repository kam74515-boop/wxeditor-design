const ContentRepo = require('../../src/repositories/content.repo');
const ContentService = require('../../src/services/content.service');

jest.mock('../../src/config/db', () => {
  const fn = jest.fn();
  const chain = {
    where: jest.fn(), first: jest.fn(), update: jest.fn(), insert: jest.fn(),
    leftJoin: jest.fn(), select: jest.fn(), whereIn: jest.fn(), whereNotNull: jest.fn(),
    distinct: jest.fn(), clone: jest.fn(), clearSelect: jest.fn(), clearOrder: jest.fn(),
    count: jest.fn(), orderBy: jest.fn(), limit: jest.fn(), offset: jest.fn(),
    whereNot: jest.fn(), groupBy: jest.fn(),
  };
  // Make all chain methods return chain for fluent API
  Object.values(chain).forEach(m => m.mockReturnValue(chain));
  fn.mockReturnValue(chain);
  chain.count.mockResolvedValue([{ count: 0 }]);
  chain.first.mockResolvedValue(null);
  chain.select.mockReturnValue(chain);
  fn.fn = { now: jest.fn(() => new Date()) };
  return fn;
});

jest.mock('../../src/repositories/content.repo');

// Mock the document.service that content.service loads lazily
jest.mock('../../src/services/document.service', () => ({
  getDocument: jest.fn().mockResolvedValue({ id: 'doc-1', title: 'Test Doc' }),
}));

describe('ContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getPublicContent ──────────────────────────────────
  describe('getPublicContent', () => {
    it('should return public content from repo', async () => {
      const mockResult = { list: [{ id: 1, title: 'Public Post' }], total: 1, page: 1, limit: 10 };
      ContentRepo.findPublic.mockResolvedValue(mockResult);

      const result = await ContentService.getPublicContent({ page: 1, limit: 10 });

      expect(ContentRepo.findPublic).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockResult);
    });

    it('should pass category param', async () => {
      ContentRepo.findPublic.mockResolvedValue({ list: [], total: 0, page: 1, limit: 10 });

      await ContentService.getPublicContent({ page: 1, category: 'tech' });

      expect(ContentRepo.findPublic).toHaveBeenCalledWith({ page: 1, category: 'tech' });
    });
  });

  // ── getMembersContent ─────────────────────────────────
  describe('getMembersContent', () => {
    it('should return members content for member user', async () => {
      const mockResult = { list: [{ id: 2 }], total: 1, page: 1, limit: 10 };
      ContentRepo.findMembers.mockResolvedValue(mockResult);
      const user = { id: 1, isMember: true };

      const result = await ContentService.getMembersContent({ page: 1 }, user);

      expect(ContentRepo.findMembers).toHaveBeenCalledWith({ page: 1 });
      expect(result).toEqual(mockResult);
    });

    it('should throw 403 if no user provided', async () => {
      await expect(
        ContentService.getMembersContent({ page: 1 }, null)
      ).rejects.toMatchObject({ statusCode: 403, code: 'MEMBERSHIP_REQUIRED' });
    });

    it('should throw 403 if user is not a member', async () => {
      const user = { id: 1, isMember: false };

      await expect(
        ContentService.getMembersContent({ page: 1 }, user)
      ).rejects.toMatchObject({ statusCode: 403, code: 'MEMBERSHIP_REQUIRED' });
    });
  });

  // ── getVipContent ─────────────────────────────────────
  describe('getVipContent', () => {
    it('should return VIP content for pro user', async () => {
      const mockResult = { list: [{ id: 3 }], total: 1, page: 1, limit: 10 };
      ContentRepo.findVip.mockResolvedValue(mockResult);
      const user = { id: 1, membership: { type: 'pro' }, role: 'user' };

      const result = await ContentService.getVipContent({ page: 1 }, user);

      expect(ContentRepo.findVip).toHaveBeenCalledWith({ page: 1 });
      expect(result).toEqual(mockResult);
    });

    it('should return VIP content for enterprise user', async () => {
      ContentRepo.findVip.mockResolvedValue({ list: [], total: 0, page: 1, limit: 10 });
      const user = { id: 1, membership: { type: 'enterprise' }, role: 'user' };

      const result = await ContentService.getVipContent({}, user);
      expect(result).toBeDefined();
    });

    it('should return VIP content for admin user regardless of membership', async () => {
      ContentRepo.findVip.mockResolvedValue({ list: [], total: 0, page: 1, limit: 10 });
      const user = { id: 1, membership: { type: 'free' }, role: 'admin' };

      const result = await ContentService.getVipContent({}, user);
      expect(result).toBeDefined();
    });

    it('should return VIP content for superadmin user', async () => {
      ContentRepo.findVip.mockResolvedValue({ list: [], total: 0, page: 1, limit: 10 });
      const user = { id: 1, membership: { type: 'free' }, role: 'superadmin' };

      const result = await ContentService.getVipContent({}, user);
      expect(result).toBeDefined();
    });

    it('should throw 403 if no user provided', async () => {
      await expect(
        ContentService.getVipContent({}, null)
      ).rejects.toMatchObject({ statusCode: 403, code: 'VIP_REQUIRED' });
    });

    it('should throw 403 for free user with non-admin role', async () => {
      const user = { id: 1, membership: { type: 'free' }, role: 'user' };

      await expect(
        ContentService.getVipContent({}, user)
      ).rejects.toMatchObject({ statusCode: 403, code: 'VIP_REQUIRED' });
    });

    it('should throw 403 for basic membership user', async () => {
      const user = { id: 1, membership: { type: 'basic' }, role: 'user' };

      await expect(
        ContentService.getVipContent({}, user)
      ).rejects.toMatchObject({ statusCode: 403, code: 'VIP_REQUIRED' });
    });

    it('should handle user with no membership object (defaults to free)', async () => {
      const user = { id: 1, role: 'user' };

      await expect(
        ContentService.getVipContent({}, user)
      ).rejects.toMatchObject({ statusCode: 403, code: 'VIP_REQUIRED' });
    });
  });

  // ── getDocumentDetail ─────────────────────────────────
  describe('getDocumentDetail', () => {
    it('should delegate to document service', async () => {
      const user = { id: 1 };
      const result = await ContentService.getDocumentDetail('doc-1', user);

      expect(result).toEqual({ id: 'doc-1', title: 'Test Doc' });
    });
  });

  // ── getCategories ─────────────────────────────────────
  describe('getCategories', () => {
    it('should return categories from repo', async () => {
      const cats = ['tech', 'life', 'design'];
      ContentRepo.getCategories.mockResolvedValue(cats);

      const result = await ContentService.getCategories();

      expect(ContentRepo.getCategories).toHaveBeenCalled();
      expect(result).toEqual(cats);
    });
  });

  // ── getMyDocuments ────────────────────────────────────
  describe('getMyDocuments', () => {
    it('should return documents by author', async () => {
      const mockResult = { list: [{ id: 1 }], total: 1, page: 1, limit: 10 };
      ContentRepo.findByAuthor.mockResolvedValue(mockResult);

      const result = await ContentService.getMyDocuments(1, { page: 1 });

      expect(ContentRepo.findByAuthor).toHaveBeenCalledWith(1, { page: 1 });
      expect(result).toEqual(mockResult);
    });
  });
});
