const MaterialRepo = require('../../src/repositories/material.repo');
const MaterialService = require('../../src/services/material.service');
const fs = require('fs');
const path = require('path');

jest.mock('../../src/config/db', () => {
  const chain = {
    where: jest.fn(), whereIn: jest.fn(), first: jest.fn(), update: jest.fn(),
    insert: jest.fn(), delete: jest.fn(), select: jest.fn(),
  };
  Object.values(chain).forEach(m => m.mockReturnValue(chain));
  const fn = jest.fn(() => chain);
  chain.count = jest.fn().mockResolvedValue([{ count: 0 }]);
  return fn;
});

jest.mock('../../src/repositories/material.repo');
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('MaterialService', () => {
  const user = { id: 1, role: 'user' };
  const adminUser = { id: 2, role: 'admin' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getMaterial ──────────────────────────────────
  describe('getMaterial', () => {
    it('should return material if found and owned by user', async () => {
      const material = { id: 1, uploader_id: 1, is_public: false };
      MaterialRepo.findById.mockResolvedValue(material);
      const result = await MaterialService.getMaterial(1, user);
      expect(result).toEqual(material);
    });

    it('should return material if public', async () => {
      const material = { id: 1, uploader_id: 99, is_public: true };
      MaterialRepo.findById.mockResolvedValue(material);
      const result = await MaterialService.getMaterial(1, user);
      expect(result).toEqual(material);
    });

    it('should return material if admin', async () => {
      const material = { id: 1, uploader_id: 99, is_public: false };
      MaterialRepo.findById.mockResolvedValue(material);
      const result = await MaterialService.getMaterial(1, adminUser);
      expect(result).toEqual(material);
    });

    it('should throw 404 if material not found', async () => {
      MaterialRepo.findById.mockResolvedValue(null);
      await expect(MaterialService.getMaterial(999, user)).rejects.toMatchObject({
        message: '素材不存在', statusCode: 404,
      });
    });

    it('should throw 403 if not owner and not public and not admin', async () => {
      MaterialRepo.findById.mockResolvedValue({ id: 1, uploader_id: 99, is_public: false });
      await expect(MaterialService.getMaterial(1, user)).rejects.toMatchObject({
        message: '无权访问此素材', statusCode: 403,
      });
    });
  });

  // ── upload ───────────────────────────────────────
  describe('upload', () => {
    it('should throw 400 if no file', async () => {
      await expect(MaterialService.upload(null, {}, user)).rejects.toMatchObject({
        message: '请选择要上传的文件', statusCode: 400,
      });
    });

    it('should create material via repo', async () => {
      const file = {
        filename: 'a.png', originalname: 'a.png', mimetype: 'image/png',
        size: 1024, path: 'public/uploads/a.png',
      };
      const created = { id: 1, filename: 'a.png' };
      MaterialRepo.create.mockResolvedValue(created);
      const result = await MaterialService.upload(file, { folderId: '1', isPublic: '0' }, user);
      expect(MaterialRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ filename: 'a.png', file_type: 'image', uploader_id: 1 })
      );
      expect(result).toEqual(created);
    });

    it('should classify video type', async () => {
      const file = {
        filename: 'v.mp4', originalname: 'v.mp4', mimetype: 'video/mp4',
        size: 2048, path: 'public/uploads/v.mp4',
      };
      MaterialRepo.create.mockResolvedValue({ id: 2 });
      await MaterialService.upload(file, {}, user);
      expect(MaterialRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ file_type: 'video' })
      );
    });

    it('should classify audio type', async () => {
      const file = {
        filename: 'a.mp3', originalname: 'a.mp3', mimetype: 'audio/mp3',
        size: 512, path: 'public/uploads/a.mp3',
      };
      MaterialRepo.create.mockResolvedValue({ id: 3 });
      await MaterialService.upload(file, {}, user);
      expect(MaterialRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ file_type: 'audio' })
      );
    });

    it('should classify generic file type', async () => {
      const file = {
        filename: 'd.pdf', originalname: 'd.pdf', mimetype: 'application/pdf',
        size: 100, path: 'public/uploads/d.pdf',
      };
      MaterialRepo.create.mockResolvedValue({ id: 4 });
      await MaterialService.upload(file, {}, user);
      expect(MaterialRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ file_type: 'file' })
      );
    });

    it('should throw 400 on path traversal in file path', async () => {
      const file = {
        filename: 'bad', originalname: 'bad', mimetype: 'text/plain',
        size: 1, path: '../../../etc/passwd',
      };
      await expect(MaterialService.upload(file, {}, user)).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  // ── uploadBatch ──────────────────────────────────
  describe('uploadBatch', () => {
    it('should throw 400 if no files', async () => {
      await expect(MaterialService.uploadBatch(null, {}, user)).rejects.toMatchObject({
        message: '请选择要上传的文件', statusCode: 400,
      });
      await expect(MaterialService.uploadBatch([], {}, user)).rejects.toMatchObject({
        message: '请选择要上传的文件', statusCode: 400,
      });
    });

    it('should upload each file and return array', async () => {
      const files = [
        { filename: 'a.png', originalname: 'a.png', mimetype: 'image/png', size: 10, path: 'public/uploads/a.png' },
        { filename: 'b.png', originalname: 'b.png', mimetype: 'image/png', size: 20, path: 'public/uploads/b.png' },
      ];
      MaterialRepo.create.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 2 });
      const result = await MaterialService.uploadBatch(files, {}, user);
      expect(result).toHaveLength(2);
      expect(MaterialRepo.create).toHaveBeenCalledTimes(2);
    });
  });

  // ── deleteMaterial ───────────────────────────────
  describe('deleteMaterial', () => {
    it('should throw 404 if not found', async () => {
      MaterialRepo.findById.mockResolvedValue(null);
      await expect(MaterialService.deleteMaterial(1, user)).rejects.toMatchObject({
        message: '素材不存在', statusCode: 404,
      });
    });

    it('should throw 403 if not owner and not admin', async () => {
      MaterialRepo.findById.mockResolvedValue({ id: 1, uploader_id: 99, file_path: 'public/uploads/a.png' });
      await expect(MaterialService.deleteMaterial(1, user)).rejects.toMatchObject({
        message: '无权删除此素材', statusCode: 403,
      });
    });

    it('should delete file and repo record', async () => {
      MaterialRepo.findById.mockResolvedValue({ id: 1, uploader_id: 1, file_path: 'public/uploads/a.png' });
      fs.existsSync.mockReturnValue(true);
      await MaterialService.deleteMaterial(1, user);
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(MaterialRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should allow admin to delete', async () => {
      MaterialRepo.findById.mockResolvedValue({ id: 1, uploader_id: 99, file_path: 'public/uploads/a.png' });
      fs.existsSync.mockReturnValue(false);
      await MaterialService.deleteMaterial(1, adminUser);
      expect(MaterialRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  // ── batchDelete ──────────────────────────────────
  describe('batchDelete', () => {
    it('should validate paths and delete via repo', async () => {
      const db = require('../../src/config/db');
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.whereIn.mockReturnValue(chain);
      chain.forEach = Array.prototype.forEach;

      const materials = [
        { id: 1, uploader_id: 1, file_path: 'public/uploads/a.png' },
        { id: 2, uploader_id: 1, file_path: 'public/uploads/b.png' },
      ];
      // Simulate db().whereIn().where() returning array
      chain.where.mockReturnValueOnce(materials);
      fs.existsSync.mockReturnValue(true);

      MaterialRepo.batchDelete.mockResolvedValue(2);
      const result = await MaterialService.batchDelete([1, 2], user);
      expect(MaterialRepo.batchDelete).toHaveBeenCalledWith([1, 2], 1);
    });
  });

  // ── listMaterials ────────────────────────────────
  describe('listMaterials', () => {
    it('should list materials with uploader filter', async () => {
      const mockList = { list: [], total: 0 };
      MaterialRepo.list.mockResolvedValue(mockList);
      const result = await MaterialService.listMaterials({ page: 1 }, user);
      expect(MaterialRepo.list).toHaveBeenCalledWith({ page: 1, uploaderId: 1 });
      expect(result).toEqual(mockList);
    });
  });

  // ── getStats ─────────────────────────────────────
  describe('getStats', () => {
    it('should return stats from repo', async () => {
      const stats = { total: 10, size: 1024 };
      MaterialRepo.getStats.mockResolvedValue(stats);
      const result = await MaterialService.getStats(user);
      expect(MaterialRepo.getStats).toHaveBeenCalledWith(1);
      expect(result).toEqual(stats);
    });
  });

  // ── moveToFolder ─────────────────────────────────
  describe('moveToFolder', () => {
    it('should throw 404 if material not found', async () => {
      MaterialRepo.findById.mockResolvedValue(null);
      await expect(MaterialService.moveToFolder(1, 5, user)).rejects.toMatchObject({
        message: '素材不存在', statusCode: 404,
      });
    });

    it('should throw 403 if not owner', async () => {
      MaterialRepo.findById.mockResolvedValue({ id: 1, uploader_id: 99 });
      await expect(MaterialService.moveToFolder(1, 5, user)).rejects.toMatchObject({
        message: '无权移动此素材', statusCode: 403,
      });
    });

    it('should move to folder', async () => {
      MaterialRepo.findById.mockResolvedValue({ id: 1, uploader_id: 1 });
      MaterialRepo.moveToFolder.mockResolvedValue({ id: 1, folder_id: 5 });
      const result = await MaterialService.moveToFolder(1, 5, user);
      expect(MaterialRepo.moveToFolder).toHaveBeenCalledWith(1, 5, 1);
      expect(result).toEqual({ id: 1, folder_id: 5 });
    });
  });

  // ── createFolder ─────────────────────────────────
  describe('createFolder', () => {
    it('should throw 400 if name empty', async () => {
      await expect(MaterialService.createFolder({ name: '' }, user)).rejects.toMatchObject({
        message: '文件夹名称不能为空', statusCode: 400,
      });
    });

    it('should create folder via repo', async () => {
      MaterialRepo.createFolder.mockResolvedValue({ id: 1, name: 'test' });
      const result = await MaterialService.createFolder({ name: 'test' }, user);
      expect(MaterialRepo.createFolder).toHaveBeenCalledWith({ name: 'test', userId: 1 });
      expect(result).toEqual({ id: 1, name: 'test' });
    });
  });

  // ── listFolders ──────────────────────────────────
  describe('listFolders', () => {
    it('should list folders via repo', async () => {
      const folders = [{ id: 1, name: 'pics' }];
      MaterialRepo.listFolders.mockResolvedValue(folders);
      const result = await MaterialService.listFolders(0, user);
      expect(MaterialRepo.listFolders).toHaveBeenCalledWith({ parentId: 0, userId: 1 });
      expect(result).toEqual(folders);
    });
  });

  // ── deleteFolder ─────────────────────────────────
  describe('deleteFolder', () => {
    it('should throw 404 if folder not found', async () => {
      const db = require('../../src/config/db');
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue(null);
      await expect(MaterialService.deleteFolder(1, user)).rejects.toMatchObject({
        message: '文件夹不存在', statusCode: 404,
      });
    });

    it('should delete folder if found', async () => {
      const db = require('../../src/config/db');
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 1, user_id: 1 });
      MaterialRepo.deleteFolder.mockResolvedValue(1);
      await MaterialService.deleteFolder(1, user);
      expect(MaterialRepo.deleteFolder).toHaveBeenCalledWith(1, 1);
    });
  });
});
