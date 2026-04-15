const db = require('../config/db');

const MaterialRepo = {
  async findById(id) {
    return db('materials').where({ id }).first();
  },

  async create(data) {
    const [id] = await db('materials').insert(data);
    return this.findById(id);
  },

  async delete(id) {
    return db('materials').where({ id }).delete();
  },

  async batchDelete(ids, uploaderId) {
    return db('materials').whereIn('id', ids).where({ uploader_id: uploaderId }).delete();
  },

  async list({ page = 1, limit = 30, type, folderId, search, uploaderId } = {}) {
    const query = db('materials').where({ uploader_id: uploaderId });
    if (type) query.where({ file_type: type });
    if (folderId) query.where({ folder_id: folderId });
    if (search) query.where(function () {
      this.where('original_name', 'like', `%${search}%`).orWhere('filename', 'like', `%${search}%`);
    });

    const [{ count }] = await query.clone().count('* as count');
    const list = await query.orderBy('created_at', 'desc').limit(limit).offset((page - 1) * limit);
    return { list, total: count, page, limit };
  },

  async getStats(uploaderId) {
    const byType = await db('materials')
      .where({ uploader_id: uploaderId })
      .select('file_type')
      .count('* as count')
      .sum('file_size as total_size')
      .groupBy('file_type');

    const [total] = await db('materials')
      .where({ uploader_id: uploaderId })
      .count('* as total_count')
      .sum('file_size as total_size');

    return { byType, total };
  },

  async moveToFolder(id, folderId, uploaderId) {
    return db('materials').where({ id, uploader_id: uploaderId }).update({ folder_id: folderId || 0 });
  },

  async createFolder({ name, parentId = 0, userId }) {
    const [id] = await db('material_folders').insert({ name, parent_id: parentId, user_id: userId });
    return db('material_folders').where({ id }).first();
  },

  async listFolders({ parentId = 0, userId } = {}) {
    return db('material_folders').where({ user_id: userId, parent_id: parentId }).orderBy('name');
  },

  async deleteFolder(id, userId) {
    await db('materials').where({ folder_id: id }).update({ folder_id: 0 });
    await db('material_folders').where({ parent_id: id }).update({ parent_id: 0 });
    return db('material_folders').where({ id, user_id: userId }).delete();
  },
};

module.exports = MaterialRepo;
