const CommentRepo = require('../repositories/comment.repo');
const db = require('../config/db');

const CommentService = {
  /**
   * 获取文档评论，返回树形结构
   */
  async listByDocument(documentId) {
    // 验证文档存在
    const doc = await db('documents').where({ id: documentId }).first();
    if (!doc) {
      throw Object.assign(new Error('文档不存在'), { statusCode: 404 });
    }

    const comments = await CommentRepo.findByDocumentId(documentId);

    // 构建树形结构
    const map = {};
    const roots = [];

    for (const c of comments) {
      map[c.id] = { ...c, replies: [] };
    }

    for (const c of comments) {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].replies.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    }

    return roots;
  },

  async create(user, data) {
    const { document_id, content, parent_id } = data;

    if (!document_id || !content) {
      throw Object.assign(new Error('文档ID和评论内容不能为空'), { statusCode: 400 });
    }

    // 验证文档存在
    const doc = await db('documents').where({ id: document_id }).first();
    if (!doc) {
      throw Object.assign(new Error('文档不存在'), { statusCode: 404 });
    }

    // 如果有父评论，验证其存在且属于同一文档
    if (parent_id) {
      const parent = await CommentRepo.findById(parent_id);
      if (!parent || parent.document_id !== document_id) {
        throw Object.assign(new Error('父评论不存在或不属于该文档'), { statusCode: 400 });
      }
    }

    return CommentRepo.create({
      document_id,
      user_id: user.id,
      parent_id: parent_id || null,
      content,
      status: 'active',
    });
  },

  async update(user, id, data) {
    const comment = await CommentRepo.findById(id);
    if (!comment) {
      throw Object.assign(new Error('评论不存在'), { statusCode: 404 });
    }
    if (comment.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权修改此评论'), { statusCode: 403 });
    }

    const updates = {};
    if (data.content !== undefined) updates.content = data.content;
    if (data.status !== undefined) updates.status = data.status;

    return CommentRepo.update(id, updates);
  },

  async remove(user, id) {
    const comment = await CommentRepo.findById(id);
    if (!comment) {
      throw Object.assign(new Error('评论不存在'), { statusCode: 404 });
    }
    if (comment.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权删除此评论'), { statusCode: 403 });
    }

    // 软删除：将状态标记为 deleted
    await CommentRepo.delete(id);
  },
};

module.exports = CommentService;
