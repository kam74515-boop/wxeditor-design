const CommentService = require('../../src/services/comment.service');
const CommentRepo = require('../../src/repositories/comment.repo');
const db = require('../../src/config/db');

// ── db mock ───────────────────────────────────────────
jest.mock('../../src/config/db', () => {
  const chain = {
    where: jest.fn(), first: jest.fn(), insert: jest.fn(),
    update: jest.fn(), delete: jest.fn(), select: jest.fn(),
  };
  Object.values(chain).forEach(m => m.mockReturnValue(chain));
  chain.first.mockResolvedValue(null);
  const fn = jest.fn(() => chain);
  return fn;
});

jest.mock('../../src/repositories/comment.repo');

describe('CommentService', () => {
  const user = { id: 1, role: 'user' };
  const adminUser = { id: 2, role: 'admin' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── listByDocument ───────────────────────────────
  describe('listByDocument', () => {
    it('should throw 404 if document not found', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue(null);
      await expect(CommentService.listByDocument('doc-1'))
        .rejects.toMatchObject({ message: '文档不存在', statusCode: 404 });
    });

    it('should return empty tree for no comments', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 'doc-1' });
      CommentRepo.findByDocumentId.mockResolvedValue([]);
      const result = await CommentService.listByDocument('doc-1');
      expect(result).toEqual([]);
    });

    it('should build tree from flat comments', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 'doc-1' });

      const comments = [
        { id: 1, document_id: 'doc-1', parent_id: null, content: 'root' },
        { id: 2, document_id: 'doc-1', parent_id: 1, content: 'reply' },
        { id: 3, document_id: 'doc-1', parent_id: 1, content: 'reply2' },
        { id: 4, document_id: 'doc-1', parent_id: null, content: 'root2' },
      ];
      CommentRepo.findByDocumentId.mockResolvedValue(comments);

      const result = await CommentService.listByDocument('doc-1');
      expect(result).toHaveLength(2); // 2 roots
      expect(result[0].replies).toHaveLength(2); // root has 2 replies
      expect(result[1].replies).toHaveLength(0);
    });

    it('should handle orphan parent_id gracefully', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 'doc-1' });

      const comments = [
        { id: 1, document_id: 'doc-1', parent_id: null, content: 'root' },
        { id: 2, document_id: 'doc-1', parent_id: 999, content: 'orphan' }, // parent 999 not in list
      ];
      CommentRepo.findByDocumentId.mockResolvedValue(comments);

      const result = await CommentService.listByDocument('doc-1');
      expect(result).toHaveLength(2); // both become roots
    });
  });

  // ── create ───────────────────────────────────────
  describe('create', () => {
    it('should throw 400 if document_id or content missing', async () => {
      await expect(CommentService.create(user, { document_id: '', content: 'hi' }))
        .rejects.toMatchObject({ message: '文档ID和评论内容不能为空', statusCode: 400 });
      await expect(CommentService.create(user, { document_id: 'd1', content: '' }))
        .rejects.toMatchObject({ message: '文档ID和评论内容不能为空', statusCode: 400 });
    });

    it('should throw 404 if document not found', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue(null);
      await expect(CommentService.create(user, { document_id: 'd1', content: 'hello' }))
        .rejects.toMatchObject({ message: '文档不存在', statusCode: 404 });
    });

    it('should throw 400 if parent comment not found or wrong doc', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 'd1' });
      CommentRepo.findById.mockResolvedValue(null);

      await expect(CommentService.create(user, { document_id: 'd1', content: 'hi', parent_id: 99 }))
        .rejects.toMatchObject({ message: '父评论不存在或不属于该文档', statusCode: 400 });
    });

    it('should throw 400 if parent belongs to different doc', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 'd1' });
      CommentRepo.findById.mockResolvedValue({ id: 99, document_id: 'd2' });

      await expect(CommentService.create(user, { document_id: 'd1', content: 'hi', parent_id: 99 }))
        .rejects.toMatchObject({ message: '父评论不存在或不属于该文档', statusCode: 400 });
    });

    it('should create root comment', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 'd1' });
      const created = { id: 1, document_id: 'd1', content: 'hello', user_id: 1 };
      CommentRepo.create.mockResolvedValue(created);

      const result = await CommentService.create(user, { document_id: 'd1', content: 'hello' });
      expect(CommentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ document_id: 'd1', content: 'hello', user_id: 1, parent_id: null, status: 'active' })
      );
      expect(result).toEqual(created);
    });

    it('should create reply comment', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 'd1' });
      CommentRepo.findById.mockResolvedValue({ id: 10, document_id: 'd1' });
      CommentRepo.create.mockResolvedValue({ id: 2, parent_id: 10 });

      const result = await CommentService.create(user, { document_id: 'd1', content: 'reply', parent_id: 10 });
      expect(CommentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ parent_id: 10 })
      );
    });
  });

  // ── update ───────────────────────────────────────
  describe('update', () => {
    it('should throw 404 if comment not found', async () => {
      CommentRepo.findById.mockResolvedValue(null);
      await expect(CommentService.update(user, 1, { content: 'x' }))
        .rejects.toMatchObject({ message: '评论不存在', statusCode: 404 });
    });

    it('should throw 403 if not owner and not admin', async () => {
      CommentRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });
      await expect(CommentService.update(user, 1, { content: 'x' }))
        .rejects.toMatchObject({ message: '无权修改此评论', statusCode: 403 });
    });

    it('should update content as owner', async () => {
      CommentRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      CommentRepo.update.mockResolvedValue({ id: 1, content: 'updated' });
      const result = await CommentService.update(user, 1, { content: 'updated' });
      expect(CommentRepo.update).toHaveBeenCalledWith(1, { content: 'updated' });
    });

    it('should update status as admin', async () => {
      CommentRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });
      CommentRepo.update.mockResolvedValue({ id: 1, status: 'hidden' });
      const result = await CommentService.update(adminUser, 1, { status: 'hidden' });
      expect(CommentRepo.update).toHaveBeenCalledWith(1, { status: 'hidden' });
    });

    it('should only pass defined fields', async () => {
      CommentRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      CommentRepo.update.mockResolvedValue({ id: 1 });
      await CommentService.update(user, 1, { content: 'c', status: undefined });
      expect(CommentRepo.update).toHaveBeenCalledWith(1, { content: 'c' });
    });
  });

  // ── remove ───────────────────────────────────────
  describe('remove', () => {
    it('should throw 404 if comment not found', async () => {
      CommentRepo.findById.mockResolvedValue(null);
      await expect(CommentService.remove(user, 1))
        .rejects.toMatchObject({ message: '评论不存在', statusCode: 404 });
    });

    it('should throw 403 if not owner and not admin', async () => {
      CommentRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });
      await expect(CommentService.remove(user, 1))
        .rejects.toMatchObject({ message: '无权删除此评论', statusCode: 403 });
    });

    it('should soft delete as owner', async () => {
      CommentRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      CommentRepo.delete.mockResolvedValue();
      await CommentService.remove(user, 1);
      expect(CommentRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should allow admin to delete', async () => {
      CommentRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });
      CommentRepo.delete.mockResolvedValue();
      await CommentService.remove(adminUser, 1);
      expect(CommentRepo.delete).toHaveBeenCalledWith(1);
    });
  });
});
