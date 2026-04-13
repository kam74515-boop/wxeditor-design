const DocumentRepo = require('../../src/repositories/document.repo');
const DocumentService = require('../../src/services/document.service');
const { sanitizeContent } = require('../../src/utils/sanitize');

jest.mock('../../src/config/db', () => {
  const fn = jest.fn();
  const chain = {
    where: jest.fn(), first: jest.fn(), update: jest.fn(), insert: jest.fn(),
    leftJoin: jest.fn(), select: jest.fn(), whereIn: jest.fn(), whereNotNull: jest.fn(),
    distinct: jest.fn(), clone: jest.fn(), clearSelect: jest.fn(), clearOrder: jest.fn(),
    count: jest.fn(), orderBy: jest.fn(), limit: jest.fn(), offset: jest.fn(),
    whereNot: jest.fn(), groupBy: jest.fn(),
  };
  Object.values(chain).forEach(m => m.mockReturnValue(chain));
  fn.mockReturnValue(chain);
  chain.count.mockResolvedValue([{ count: 0 }]);
  chain.first.mockResolvedValue(null);
  chain.select.mockReturnValue(chain);
  fn.fn = { now: jest.fn(() => new Date()) };
  return fn;
});

jest.mock('../../src/repositories/document.repo');
jest.mock('../../src/utils/sanitize');

describe('DocumentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sanitizeContent.mockImplementation(v => v);
  });

  // ── getDocument ─────────────────────────────────────
  describe('getDocument', () => {
    it('should throw 404 if document not found', async () => {
      DocumentRepo.findById.mockResolvedValue(null);

      await expect(
        DocumentService.getDocument('missing-id', { id: 1, role: 'user' })
      ).rejects.toMatchObject({ statusCode: 404, message: '文档不存在' });
    });

    it('should throw 404 if document is deleted', async () => {
      DocumentRepo.findById.mockResolvedValue({ id: 'd1', status: 'deleted', visibility: 'public', author_id: 'a1' });

      await expect(
        DocumentService.getDocument('d1', { id: 1, role: 'user' })
      ).rejects.toMatchObject({ statusCode: 404, message: '文档不存在' });
    });

    it('should throw 403 if user lacks permission for private doc', async () => {
      DocumentRepo.findById.mockResolvedValue({ id: 'd1', status: 'active', visibility: 'private', author_id: 'other' });
      const user = { id: 1, role: 'user' };

      await expect(
        DocumentService.getDocument('d1', user)
      ).rejects.toMatchObject({ statusCode: 403, message: '无权访问此内容' });
    });

    it('should throw 403 with members_only message for members_only doc when user lacks permission', async () => {
      DocumentRepo.findById.mockResolvedValue({ id: 'd1', status: 'active', visibility: 'members_only', author_id: 'other' });
      const user = { id: 1, role: 'user' };

      await expect(
        DocumentService.getDocument('d1', user)
      ).rejects.toMatchObject({ statusCode: 403, message: '此内容需要会员权限' });
    });

    it('should throw 403 if no user and doc is not public', async () => {
      DocumentRepo.findById.mockResolvedValue({ id: 'd1', status: 'active', visibility: 'private', author_id: 'a1' });

      await expect(
        DocumentService.getDocument('d1', null)
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should return public doc for anonymous user', async () => {
      const doc = { id: 'd1', status: 'active', visibility: 'public', author_id: 'a1' };
      DocumentRepo.findById.mockResolvedValue(doc);

      const result = await DocumentService.getDocument('d1', null);
      expect(result).toEqual(doc);
    });

    it('should return doc for admin even if not author', async () => {
      const doc = { id: 'd1', status: 'active', visibility: 'private', author_id: 'other' };
      DocumentRepo.findById.mockResolvedValue(doc);
      const admin = { id: 1, role: 'admin' };

      const result = await DocumentService.getDocument('d1', admin);
      expect(result).toEqual(doc);
    });

    it('should return doc for superadmin even if not author', async () => {
      const doc = { id: 'd1', status: 'active', visibility: 'private', author_id: 'other' };
      DocumentRepo.findById.mockResolvedValue(doc);
      const superadmin = { id: 1, role: 'superadmin' };

      const result = await DocumentService.getDocument('d1', superadmin);
      expect(result).toEqual(doc);
    });

    it('should return doc for author', async () => {
      const doc = { id: 'd1', status: 'active', visibility: 'private', author_id: 'u1' };
      DocumentRepo.findById.mockResolvedValue(doc);
      const author = { id: 'u1', role: 'user' };

      const result = await DocumentService.getDocument('d1', author);
      expect(result).toEqual(doc);
    });

    it('should return public doc for any logged-in user', async () => {
      const doc = { id: 'd1', status: 'active', visibility: 'public', author_id: 'other' };
      DocumentRepo.findById.mockResolvedValue(doc);
      const user = { id: 1, role: 'user' };

      const result = await DocumentService.getDocument('d1', user);
      expect(result).toEqual(doc);
    });
  });

  // ── createDocument ──────────────────────────────────
  describe('createDocument', () => {
    const baseUser = { id: 'u1', role: 'user', isMember: true, membership: { type: 'free' } };

    it('should throw 403 when free user reaches document limit', async () => {
      DocumentRepo.countByAuthor.mockResolvedValue(3);

      await expect(
        DocumentService.createDocument({ title: 'Doc' }, baseUser)
      ).rejects.toMatchObject({ statusCode: 403, message: '文档数量已达上限，请升级会员' });
    });

    it('should allow basic user within limit', async () => {
      const basicUser = { id: 'u1', role: 'user', isMember: true, membership: { type: 'basic' } };
      DocumentRepo.countByAuthor.mockResolvedValue(10);
      DocumentRepo.create.mockResolvedValue({ id: 'new' });

      const result = await DocumentService.createDocument({ title: 'Doc' }, basicUser);
      expect(result).toEqual({ id: 'new' });
      expect(DocumentRepo.create).toHaveBeenCalled();
    });

    it('should throw 403 when basic user at limit', async () => {
      const basicUser = { id: 'u1', role: 'user', isMember: true, membership: { type: 'basic' } };
      DocumentRepo.countByAuthor.mockResolvedValue(50);

      await expect(
        DocumentService.createDocument({ title: 'Doc' }, basicUser)
      ).rejects.toMatchObject({ statusCode: 403, message: '文档数量已达上限，请升级会员' });
    });

    it('should allow pro user within limit', async () => {
      const proUser = { id: 'u1', role: 'user', isMember: true, membership: { type: 'pro' } };
      DocumentRepo.countByAuthor.mockResolvedValue(100);
      DocumentRepo.create.mockResolvedValue({ id: 'new' });

      const result = await DocumentService.createDocument({ title: 'Doc' }, proUser);
      expect(result).toEqual({ id: 'new' });
    });

    it('should throw 403 when pro user at limit', async () => {
      const proUser = { id: 'u1', role: 'user', isMember: true, membership: { type: 'pro' } };
      DocumentRepo.countByAuthor.mockResolvedValue(200);

      await expect(
        DocumentService.createDocument({ title: 'Doc' }, proUser)
      ).rejects.toMatchObject({ statusCode: 403, message: '文档数量已达上限，请升级会员' });
    });

    it('should skip limit check for enterprise user (unlimited)', async () => {
      const entUser = { id: 'u1', role: 'user', isMember: true, membership: { type: 'enterprise' } };
      DocumentRepo.create.mockResolvedValue({ id: 'new' });

      const result = await DocumentService.createDocument({ title: 'Doc' }, entUser);
      expect(result).toEqual({ id: 'new' });
      expect(DocumentRepo.countByAuthor).not.toHaveBeenCalled();
    });

    it('should default to free limits when user has no membership', async () => {
      const noMemberUser = { id: 'u1', role: 'user', isMember: false };
      DocumentRepo.countByAuthor.mockResolvedValue(3);

      await expect(
        DocumentService.createDocument({ title: 'Doc' }, noMemberUser)
      ).rejects.toMatchObject({ statusCode: 403, message: '文档数量已达上限，请升级会员' });
    });

    it('should throw 403 when non-member tries to create members_only doc', async () => {
      const nonMember = { id: 'u1', role: 'user', isMember: false, membership: { type: 'enterprise' } };
      DocumentRepo.create.mockResolvedValue({ id: 'new' });

      await expect(
        DocumentService.createDocument({ title: 'Doc', visibility: 'members_only' }, nonMember)
      ).rejects.toMatchObject({ statusCode: 403, message: '发布会员专享内容需要会员权限' });
    });

    it('should sanitize content and summary via sanitizeContent', async () => {
      DocumentRepo.countByAuthor.mockResolvedValue(1);
      DocumentRepo.create.mockResolvedValue({ id: 'new' });
      sanitizeContent.mockReturnValue('cleaned');

      await DocumentService.createDocument(
        { title: 'Doc', content: '<script>bad</script>', summary: '<iframe>evil</iframe>' },
        baseUser
      );

      expect(sanitizeContent).toHaveBeenCalledWith('<script>bad</script>');
      expect(sanitizeContent).toHaveBeenCalledWith('<iframe>evil</iframe>');
      expect(DocumentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'cleaned', summary: 'cleaned' })
      );
    });

    it('should not call sanitizeContent if content/summary absent', async () => {
      DocumentRepo.countByAuthor.mockResolvedValue(1);
      DocumentRepo.create.mockResolvedValue({ id: 'new' });

      await DocumentService.createDocument({ title: 'Doc' }, baseUser);

      expect(sanitizeContent).not.toHaveBeenCalled();
    });

    it('should create document successfully with author_id set', async () => {
      DocumentRepo.countByAuthor.mockResolvedValue(1);
      DocumentRepo.create.mockResolvedValue({ id: 'new', author_id: 'u1' });

      const result = await DocumentService.createDocument({ title: 'Doc', content: 'hello' }, baseUser);

      expect(DocumentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ author_id: 'u1', title: 'Doc' })
      );
      expect(result).toEqual({ id: 'new', author_id: 'u1' });
    });
  });

  // ── updateDocument ──────────────────────────────────
  describe('updateDocument', () => {
    const doc = { id: 'd1', status: 'active', author_id: 'u1', visibility: 'public' };

    it('should throw 404 if document not found', async () => {
      DocumentRepo.findById.mockResolvedValue(null);

      await expect(
        DocumentService.updateDocument('missing', { title: 'x' }, { id: 'u1', role: 'user' })
      ).rejects.toMatchObject({ statusCode: 404, message: '文档不存在' });
    });

    it('should throw 403 if user is not author or admin', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);

      await expect(
        DocumentService.updateDocument('d1', { title: 'x' }, { id: 'other', role: 'user' })
      ).rejects.toMatchObject({ statusCode: 403, message: '无权编辑此文档' });
    });

    it('should allow author to update', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);
      DocumentRepo.update.mockResolvedValue({ ...doc, title: 'updated' });

      const result = await DocumentService.updateDocument('d1', { title: 'updated' }, { id: 'u1', role: 'user' });
      expect(result.title).toBe('updated');
      expect(DocumentRepo.update).toHaveBeenCalledWith('d1', { title: 'updated' });
    });

    it('should allow admin to update any document', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);
      DocumentRepo.update.mockResolvedValue({ ...doc, title: 'admin-edited' });

      const result = await DocumentService.updateDocument('d1', { title: 'admin-edited' }, { id: 'admin1', role: 'admin' });
      expect(result.title).toBe('admin-edited');
    });

    it('should allow superadmin to update any document', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);
      DocumentRepo.update.mockResolvedValue({ ...doc, title: 'sa-edited' });

      const result = await DocumentService.updateDocument('d1', { title: 'sa-edited' }, { id: 'sa1', role: 'superadmin' });
      expect(result.title).toBe('sa-edited');
    });

    it('should throw 403 if non-member sets visibility to members_only', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);

      await expect(
        DocumentService.updateDocument('d1', { visibility: 'members_only' }, { id: 'u1', role: 'user', isMember: false })
      ).rejects.toMatchObject({ statusCode: 403, message: '发布会员专享内容需要会员权限' });
    });

    it('should allow member to set visibility to members_only', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);
      DocumentRepo.update.mockResolvedValue({ ...doc, visibility: 'members_only' });

      const result = await DocumentService.updateDocument(
        'd1', { visibility: 'members_only' }, { id: 'u1', role: 'user', isMember: true }
      );
      expect(result.visibility).toBe('members_only');
    });

    it('should sanitize content and summary', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);
      DocumentRepo.update.mockResolvedValue(doc);
      sanitizeContent.mockReturnValue('cleaned');

      await DocumentService.updateDocument(
        'd1',
        { content: '<script>bad</script>', summary: '<iframe>x</iframe>' },
        { id: 'u1', role: 'user' }
      );

      expect(sanitizeContent).toHaveBeenCalledWith('<script>bad</script>');
      expect(sanitizeContent).toHaveBeenCalledWith('<iframe>x</iframe>');
      expect(DocumentRepo.update).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ content: 'cleaned', summary: 'cleaned' })
      );
    });

    it('should not sanitize when content/summary not in data', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);
      DocumentRepo.update.mockResolvedValue(doc);

      await DocumentService.updateDocument('d1', { title: 'new title' }, { id: 'u1', role: 'user' });

      expect(sanitizeContent).not.toHaveBeenCalled();
    });
  });

  // ── deleteDocument ──────────────────────────────────
  describe('deleteDocument', () => {
    const doc = { id: 'd1', status: 'active', author_id: 'u1' };

    it('should throw 404 if document not found', async () => {
      DocumentRepo.findById.mockResolvedValue(null);

      await expect(
        DocumentService.deleteDocument('missing', { id: 'u1', role: 'user' })
      ).rejects.toMatchObject({ statusCode: 404, message: '文档不存在' });
    });

    it('should throw 403 if user is not author and not admin', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);

      await expect(
        DocumentService.deleteDocument('d1', { id: 'other', role: 'user' })
      ).rejects.toMatchObject({ statusCode: 403, message: '无权删除此文档' });
    });

    it('should allow author to delete', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);
      DocumentRepo.softDelete.mockResolvedValue();

      await DocumentService.deleteDocument('d1', { id: 'u1', role: 'user' });
      expect(DocumentRepo.softDelete).toHaveBeenCalledWith('d1');
    });

    it('should allow admin to delete any document', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);
      DocumentRepo.softDelete.mockResolvedValue();

      await DocumentService.deleteDocument('d1', { id: 'admin1', role: 'admin' });
      expect(DocumentRepo.softDelete).toHaveBeenCalledWith('d1');
    });

    it('should allow superadmin to delete any document', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);
      DocumentRepo.softDelete.mockResolvedValue();

      await DocumentService.deleteDocument('d1', { id: 'sa1', role: 'superadmin' });
      expect(DocumentRepo.softDelete).toHaveBeenCalledWith('d1');
    });
  });

  // ── listDocuments ───────────────────────────────────
  describe('listDocuments', () => {
    it('should delegate to DocumentRepo.list', async () => {
      const mockResult = { list: [{ id: 1 }], total: 1, page: 1, limit: 10 };
      DocumentRepo.list.mockResolvedValue(mockResult);

      const result = await DocumentService.listDocuments({ page: 1, limit: 10 });

      expect(DocumentRepo.list).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockResult);
    });

    it('should pass filter params to repo', async () => {
      DocumentRepo.list.mockResolvedValue({ list: [], total: 0, page: 1, limit: 10 });

      await DocumentService.listDocuments({ page: 2, limit: 5, category: 'tech' });

      expect(DocumentRepo.list).toHaveBeenCalledWith({ page: 2, limit: 5, category: 'tech' });
    });
  });

  // ── listPublicDocuments ─────────────────────────────
  describe('listPublicDocuments', () => {
    it('should delegate to DocumentRepo.listPublic', async () => {
      const mockResult = { list: [{ id: 1 }], total: 1, page: 1, limit: 10 };
      DocumentRepo.listPublic.mockResolvedValue(mockResult);

      const result = await DocumentService.listPublicDocuments({ page: 1 });

      expect(DocumentRepo.listPublic).toHaveBeenCalledWith({ page: 1 });
      expect(result).toEqual(mockResult);
    });
  });

  // ── getHistory ──────────────────────────────────────
  describe('getHistory', () => {
    it('should delegate to DocumentRepo.getHistory', async () => {
      const mockHistory = [{ id: 'h1', version: 1 }];
      DocumentRepo.getHistory.mockResolvedValue(mockHistory);

      const result = await DocumentService.getHistory('d1', { page: 1 });

      expect(DocumentRepo.getHistory).toHaveBeenCalledWith('d1', { page: 1 });
      expect(result).toEqual(mockHistory);
    });
  });

  // ── addCollaborator ─────────────────────────────────
  describe('addCollaborator', () => {
    const doc = { id: 'd1', author_id: 'u1' };

    it('should throw 404 if document not found', async () => {
      DocumentRepo.findById.mockResolvedValue(null);

      await expect(
        DocumentService.addCollaborator('missing', { userId: 'u2', role: 'editor' }, { id: 'u1', role: 'user' })
      ).rejects.toMatchObject({ statusCode: 404, message: '文档不存在' });
    });

    it('should throw 403 if user is not the author', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);

      await expect(
        DocumentService.addCollaborator('d1', { userId: 'u2', role: 'editor' }, { id: 'other', role: 'user' })
      ).rejects.toMatchObject({ statusCode: 403, message: '只有作者可以添加协作者' });
    });

    it('should throw 409 if user is already a collaborator', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);
      DocumentRepo.isCollaborator.mockResolvedValue(true);

      await expect(
        DocumentService.addCollaborator('d1', { userId: 'u2', role: 'editor' }, { id: 'u1', role: 'user' })
      ).rejects.toMatchObject({ statusCode: 409, message: '该用户已是协作者' });
    });

    it('should add collaborator successfully', async () => {
      DocumentRepo.findById.mockResolvedValue(doc);
      DocumentRepo.isCollaborator.mockResolvedValue(false);
      DocumentRepo.addCollaborator.mockResolvedValue();

      await DocumentService.addCollaborator('d1', { userId: 'u2', role: 'editor' }, { id: 'u1', role: 'user' });

      expect(DocumentRepo.addCollaborator).toHaveBeenCalledWith({
        document_id: 'd1',
        user_id: 'u2',
        role: 'editor',
      });
    });
  });

  // ── getCollaborators ────────────────────────────────
  describe('getCollaborators', () => {
    it('should delegate to DocumentRepo.getCollaborators', async () => {
      const collabs = [{ user_id: 'u2', role: 'editor' }];
      DocumentRepo.getCollaborators.mockResolvedValue(collabs);

      const result = await DocumentService.getCollaborators('d1');

      expect(DocumentRepo.getCollaborators).toHaveBeenCalledWith('d1');
      expect(result).toEqual(collabs);
    });
  });

  // ── getCategories ───────────────────────────────────
  describe('getCategories', () => {
    it('should delegate to DocumentRepo.getCategories', async () => {
      const cats = ['tech', 'life', 'design'];
      DocumentRepo.getCategories.mockResolvedValue(cats);

      const result = await DocumentService.getCategories();

      expect(DocumentRepo.getCategories).toHaveBeenCalled();
      expect(result).toEqual(cats);
    });
  });

  // ── getStats ────────────────────────────────────────
  describe('getStats', () => {
    it('should delegate to DocumentRepo.getStats', async () => {
      const stats = { total: 100, public: 60, private: 40 };
      DocumentRepo.getStats.mockResolvedValue(stats);

      const result = await DocumentService.getStats();

      expect(DocumentRepo.getStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });
});
