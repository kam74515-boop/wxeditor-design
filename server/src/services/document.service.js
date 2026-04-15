const DocumentRepo = require('../repositories/document.repo');
const UserRepo = require('../repositories/user.repo');
const { sanitizeContent } = require('../utils/sanitize');

const MEMBERSHIP_LIMITS = {
  free: { documents: 3 },
  basic: { documents: 50 },
  pro: { documents: 200 },
  enterprise: { documents: -1 },
};

const DocumentService = {
  async getDocument(id, user) {
    const doc = await DocumentRepo.findById(id);
    if (!doc) throw Object.assign(new Error('文档不存在'), { statusCode: 404 });

    if (doc.status === 'deleted') throw Object.assign(new Error('文档不存在'), { statusCode: 404 });

    if (!canView(doc, user)) {
      const msg = doc.visibility === 'members_only' ? '此内容需要会员权限' : '无权访问此内容';
      throw Object.assign(new Error(msg), { statusCode: 403 });
    }

    return doc;
  },

  async createDocument(data, user) {
    const limits = getLimits(user);
    if (limits.documents !== -1) {
      const count = await DocumentRepo.countByAuthor(user.id);
      if (count >= limits.documents) {
        throw Object.assign(new Error('文档数量已达上限，请升级会员'), { statusCode: 403 });
      }
    }

    if (data.visibility === 'members_only' && !user.isMember) {
      throw Object.assign(new Error('发布会员专享内容需要会员权限'), { statusCode: 403 });
    }

    // 清理 HTML 内容中的 XSS 向量
    if (data.content) data.content = sanitizeContent(data.content);
    if (data.summary) data.summary = sanitizeContent(data.summary);

    return DocumentRepo.create({ ...data, author_id: user.id });
  },

  async updateDocument(id, data, user) {
    const doc = await DocumentRepo.findById(id);
    if (!doc) throw Object.assign(new Error('文档不存在'), { statusCode: 404 });

    if (!canEdit(doc, user)) {
      throw Object.assign(new Error('无权编辑此文档'), { statusCode: 403 });
    }

    if (data.visibility === 'members_only' && !user.isMember) {
      throw Object.assign(new Error('发布会员专享内容需要会员权限'), { statusCode: 403 });
    }

    // 清理 HTML 内容中的 XSS 向量
    if (data.content) data.content = sanitizeContent(data.content);
    if (data.summary) data.summary = sanitizeContent(data.summary);

    return DocumentRepo.update(id, data);
  },

  async deleteDocument(id, user) {
    const doc = await DocumentRepo.findById(id);
    if (!doc) throw Object.assign(new Error('文档不存在'), { statusCode: 404 });

    if (doc.author_id !== user.id && !['admin', 'superadmin'].includes(user.role)) {
      throw Object.assign(new Error('无权删除此文档'), { statusCode: 403 });
    }

    await DocumentRepo.softDelete(id);
  },

  async listDocuments(params) {
    return DocumentRepo.list(params);
  },

  async listPublicDocuments(params) {
    return DocumentRepo.listPublic(params);
  },

  async getHistory(id, params) {
    return DocumentRepo.getHistory(id, params);
  },

  async addCollaborator(documentId, { userId, role }, user) {
    const doc = await DocumentRepo.findById(documentId);
    if (!doc) throw Object.assign(new Error('文档不存在'), { statusCode: 404 });
    if (doc.author_id !== user.id) {
      throw Object.assign(new Error('只有作者可以添加协作者'), { statusCode: 403 });
    }

    const exists = await DocumentRepo.isCollaborator(documentId, userId);
    if (exists) throw Object.assign(new Error('该用户已是协作者'), { statusCode: 409 });

    await DocumentRepo.addCollaborator({ document_id: documentId, user_id: userId, role });
  },

  async getCollaborators(id) {
    return DocumentRepo.getCollaborators(id);
  },

  async getCategories() {
    return DocumentRepo.getCategories();
  },

  async getStats() {
    return DocumentRepo.getStats();
  },
};

function canView(doc, user) {
  if (!user) return doc.visibility === 'public';
  if (['admin', 'superadmin'].includes(user.role)) return true;
  if (doc.author_id === user.id) return true;
  if (doc.visibility === 'public') return true;
  return false;
}

function canEdit(doc, user) {
  if (['admin', 'superadmin'].includes(user.role)) return true;
  if (doc.author_id === user.id) return true;
  return false;
}

function getLimits(user) {
  const type = user.membership?.type || 'free';
  return MEMBERSHIP_LIMITS[type] || MEMBERSHIP_LIMITS.free;
}

module.exports = DocumentService;
