const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const MaterialService = require('../services/material.service');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'materials');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const datePath = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const typeDir = path.join(uploadsDir, file.mimetype.startsWith('image/') ? 'image' :
      file.mimetype.startsWith('video/') ? 'video' :
      file.mimetype.startsWith('audio/') ? 'audio' : 'file', datePath);
    if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 30, type = '', folderId = '', search = '' } = req.query;
    const result = await MaterialService.listMaterials({ page: parseInt(page), limit: parseInt(limit), type, folderId: folderId ? parseInt(folderId) : undefined, search }, req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const material = await MaterialService.upload(req.file, req.body, req.user);
    res.status(201).json({ success: true, message: '上传成功', data: material });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/upload-batch', auth, upload.array('files', 20), async (req, res) => {
  try {
    const materials = await MaterialService.uploadBatch(req.files, req.body, req.user);
    res.status(201).json({ success: true, message: `成功上传 ${materials.length} 个文件`, data: materials });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const material = await MaterialService.getMaterial(req.params.id, req.user);
    res.json({ success: true, data: material });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await MaterialService.deleteMaterial(req.params.id, req.user);
    res.json({ success: true, message: '素材已删除' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.delete('/batch', auth, async (req, res) => {
  try {
    const count = await MaterialService.batchDelete(req.body.ids, req.user);
    res.json({ success: true, message: `已删除 ${count} 个素材` });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.put('/:id/folder', auth, async (req, res) => {
  try {
    await MaterialService.moveToFolder(req.params.id, req.body.folderId, req.user);
    res.json({ success: true, message: '素材已移动' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/stats/usage', auth, async (req, res) => {
  try {
    const stats = await MaterialService.getStats(req.user);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/folders', auth, async (req, res) => {
  try {
    const folder = await MaterialService.createFolder(req.body, req.user);
    res.status(201).json({ success: true, data: folder });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/folders/list', auth, async (req, res) => {
  try {
    const folders = await MaterialService.listFolders(req.query.parentId ? parseInt(req.query.parentId) : 0, req.user);
    res.json({ success: true, data: folders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/folders/:id', auth, async (req, res) => {
  try {
    await MaterialService.deleteFolder(req.params.id, req.user);
    res.json({ success: true, message: '文件夹已删除' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

module.exports = router;
