const ContentRepo = require('../repositories/content.repo');
const { sanitizeContent } = require('../utils/sanitize');

// 延迟加载避免循环依赖
let _DocumentService = null;
function getDocumentService() {
  if (!_DocumentService) _DocumentService = require('./document.service');
  return _DocumentService;
}

const ContentService = {
  async getPublicContent(params) {
    return ContentRepo.findPublic(params);
  },

  async getMembersContent(params, user) {
    if (!user) throw Object.assign(new Error('此内容需要会员权限'), { statusCode: 403, code: 'MEMBERSHIP_REQUIRED' });
    if (!user.isMember) throw Object.assign(new Error('此内容需要会员权限'), { statusCode: 403, code: 'MEMBERSHIP_REQUIRED' });
    return ContentRepo.findMembers(params);
  },

  async getVipContent(params, user) {
    if (!user) throw Object.assign(new Error('此内容需要Pro或企业版会员'), { statusCode: 403, code: 'VIP_REQUIRED' });
    const type = user.membership?.type || 'free';
    if (!['pro', 'enterprise'].includes(type) && !['admin', 'superadmin'].includes(user.role)) {
      throw Object.assign(new Error('此内容需要Pro或企业版会员'), { statusCode: 403, code: 'VIP_REQUIRED' });
    }
    return ContentRepo.findVip(params);
  },

  async getDocumentDetail(id, user) {
    return getDocumentService().getDocument(id, user);
  },

  async getCategories() {
    return ContentRepo.getCategories();
  },

  async getMyDocuments(userId, params) {
    return ContentRepo.findByAuthor(userId, params);
  },
};

module.exports = ContentService;
module.exports.sanitizeContent = sanitizeContent;
