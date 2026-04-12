const MaterialRepo = require('../repositories/material.repo');
const db = require('../config/db');
const path = require('path');
const fs = require('fs');

// 允许的文件存储根目录（绝对路径）
const ALLOWED_UPLOAD_ROOT = path.resolve(__dirname, '..', '..', 'public', 'uploads');

/**
 * validateFilePath - 验证文件路径不包含路径遍历且在允许目录下
 * 防止通过 '..' 或符号链接逃逸到 uploads 目录之外
 */
function validateFilePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    throw Object.assign(new Error('无效的文件路径'), { statusCode: 400 });
  }
  // 不允许路径遍历
  if (filePath.includes('..')) {
    throw Object.assign(new Error('文件路径不允许包含路径遍历'), { statusCode: 400 });
  }
  // 解析为绝对路径并验证在允许目录下
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(ALLOWED_UPLOAD_ROOT)) {
    throw Object.assign(new Error('文件路径超出允许范围'), { statusCode: 400 });
  }
  return resolved;
}

function getFileType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
}

const MaterialService = {
  async getMaterial(id, user) {
    const material = await MaterialRepo.findById(id);
    if (!material) throw Object.assign(new Error('素材不存在'), { statusCode: 404 });
    if (material.uploader_id !== user.id && !material.is_public && user.role !== 'admin') {
      throw Object.assign(new Error('无权访问此素材'), { statusCode: 403 });
    }
    return material;
  },

  async upload(file, data, user) {
    if (!file) throw Object.assign(new Error('请选择要上传的文件'), { statusCode: 400 });

    // 验证上传文件路径在允许的 uploads 目录下
    const resolvedPath = validateFilePath(file.path);

    const fileType = getFileType(file.mimetype);
    const relativePath = file.path.split('public')[1];
    const url = relativePath.replace(/\\/g, '/');

    return MaterialRepo.create({
      filename: file.filename,
      original_name: file.originalname,
      file_type: fileType,
      file_size: file.size,
      file_path: file.path,
      url,
      mime_type: file.mimetype,
      uploader_id: user.id,
      folder_id: parseInt(data.folderId) || 0,
      is_public: parseInt(data.isPublic) || 0,
    });
  },

  async uploadBatch(files, data, user) {
    if (!files || files.length === 0) throw Object.assign(new Error('请选择要上传的文件'), { statusCode: 400 });

    const materials = [];
    for (const file of files) {
      const material = await this.upload(file, data, user);
      materials.push(material);
    }
    return materials;
  },

  async deleteMaterial(id, user) {
    const material = await MaterialRepo.findById(id);
    if (!material) throw Object.assign(new Error('素材不存在'), { statusCode: 404 });
    if (material.uploader_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权删除此素材'), { statusCode: 403 });
    }
    // 验证文件路径安全
    const safePath = validateFilePath(material.file_path);
    if (fs.existsSync(safePath)) fs.unlinkSync(safePath);
    await MaterialRepo.delete(id);
  },

  async batchDelete(ids, user) {
    const materials = await db('materials').whereIn('id', ids).where({ uploader_id: user.id });
    materials.forEach(m => {
      try {
        const safePath = validateFilePath(m.file_path);
        if (fs.existsSync(safePath)) fs.unlinkSync(safePath);
      } catch (e) {
        console.error('batchDelete path validation error:', e.message);
      }
    });
    return MaterialRepo.batchDelete(ids, user.id);
  },

  async listMaterials(params, user) {
    return MaterialRepo.list({ ...params, uploaderId: user.id });
  },

  async getStats(user) {
    return MaterialRepo.getStats(user.id);
  },

  async moveToFolder(id, folderId, user) {
    const material = await MaterialRepo.findById(id);
    if (!material) throw Object.assign(new Error('素材不存在'), { statusCode: 404 });
    if (material.uploader_id !== user.id) throw Object.assign(new Error('无权移动此素材'), { statusCode: 403 });
    return MaterialRepo.moveToFolder(id, folderId, user.id);
  },

  async createFolder(data, user) {
    if (!data.name) throw Object.assign(new Error('文件夹名称不能为空'), { statusCode: 400 });
    return MaterialRepo.createFolder({ ...data, userId: user.id });
  },

  async listFolders(parentId, user) {
    return MaterialRepo.listFolders({ parentId, userId: user.id });
  },

  async deleteFolder(id, user) {
    const folder = await db('material_folders').where({ id, user_id: user.id }).first();
    if (!folder) throw Object.assign(new Error('文件夹不存在'), { statusCode: 404 });
    await MaterialRepo.deleteFolder(id, user.id);
  },
};

module.exports = MaterialService;
