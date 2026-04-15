const TemplateRepo = require('../repositories/template.repo');

const TemplateService = {
  async getTemplate(id, user) {
    const template = await TemplateRepo.findById(id);
    if (!template) throw Object.assign(new Error('模板不存在'), { statusCode: 404 });
    if (!template.is_public && (!user || user.id !== template.author_id)) {
      throw Object.assign(new Error('无权访问此模板'), { statusCode: 403 });
    }
    return template;
  },

  async createTemplate(data, user) {
    if (!data.name || !data.content) {
      throw Object.assign(new Error('模板名称和内容不能为空'), { statusCode: 400 });
    }
    return TemplateRepo.create({ ...data, author_id: user.id });
  },

  async updateTemplate(id, data, user) {
    const template = await TemplateRepo.findById(id);
    if (!template) throw Object.assign(new Error('模板不存在'), { statusCode: 404 });
    if (template.author_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权修改此模板'), { statusCode: 403 });
    }
    return TemplateRepo.update(id, data);
  },

  async deleteTemplate(id, user) {
    const template = await TemplateRepo.findById(id);
    if (!template) throw Object.assign(new Error('模板不存在'), { statusCode: 404 });
    if (template.author_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权删除此模板'), { statusCode: 403 });
    }
    await TemplateRepo.softDelete(id);
  },

  async listTemplates(params, user) {
    return TemplateRepo.list({ ...params, authorId: user?.id });
  },

  async getCategories() {
    return TemplateRepo.getCategories();
  },

  async useTemplate(id) {
    await TemplateRepo.incrementUseCount(id);
  },

  async cloneTemplate(id, user) {
    const cloned = await TemplateRepo.clone(id, user.id);
    if (!cloned) throw Object.assign(new Error('模板不存在'), { statusCode: 404 });
    return cloned;
  },
};

module.exports = TemplateService;
