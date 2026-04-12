const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { auth, optionalAuth } = require('../middleware/auth');
const { formatDatePath, generateRandomString } = require('../utils/helpers');

const uploadsDir = path.join(__dirname, '..', 'public/uploads/materials');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const datePath = formatDatePath();
    const typeDir = path.join(uploadsDir, file.mimetype.startsWith('image/') ? 'image' : 
                              file.mimetype.startsWith('video/') ? 'video' : 
                              file.mimetype.startsWith('audio/') ? 'audio' : 'file', datePath);
    ensureDir(typeDir);
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = generateRandomString(6);
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}_${random}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

function getFileType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
}

router.get('/', auth, (req, res) => {
  const { 
    page = 1, 
    limit = 30, 
    type = '', 
    folderId = '',
    search = ''
  } = req.query;
  
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let sql = 'SELECT * FROM materials WHERE uploader_id = ?';
  const params = [req.user.id];

  if (type) {
    sql += ' AND file_type = ?';
    params.push(type);
  }

  if (folderId) {
    sql += ' AND folder_id = ?';
    params.push(parseInt(folderId));
  }

  if (search) {
    sql += ' AND (original_name LIKE ? OR filename LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const { total } = db.prepare(countSql).get(...params);

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const materials = db.prepare(sql).all(...params);

  res.json({
    success: true,
    data: {
      list: materials,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    }
  });
});

router.post('/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: '请选择要上传的文件'
    });
  }

  const file = req.file;
  const fileType = getFileType(file.mimetype);
  const relativePath = file.path.split('public')[1];
  const url = relativePath.replace(/\\/g, '/');

  const { folderId = 0, isPublic = 0 } = req.body;

  const result = db.prepare(
    'INSERT INTO materials (filename, original_name, file_type, file_size, file_path, url, mime_type, uploader_id, folder_id, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    file.filename,
    file.originalname,
    fileType,
    file.size,
    file.path,
    url,
    file.mimetype,
    req.user.id,
    parseInt(folderId),
    parseInt(isPublic)
  );

  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    success: true,
    message: '上传成功',
    data: material
  });
});

router.post('/upload-batch', auth, upload.array('files', 20), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请选择要上传的文件'
    });
  }

  const { folderId = 0, isPublic = 0 } = req.body;
  const materials = [];

  const insertStmt = db.prepare(
    'INSERT INTO materials (filename, original_name, file_type, file_size, file_path, url, mime_type, uploader_id, folder_id, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  for (const file of req.files) {
    const fileType = getFileType(file.mimetype);
    const relativePath = file.path.split('public')[1];
    const url = relativePath.replace(/\\/g, '/');

    const result = insertStmt.run(
      file.filename,
      file.originalname,
      fileType,
      file.size,
      file.path,
      url,
      file.mimetype,
      req.user.id,
      parseInt(folderId),
      parseInt(isPublic)
    );

    materials.push(db.prepare('SELECT * FROM materials WHERE id = ?').get(result.lastInsertRowid));
  }

  res.status(201).json({
    success: true,
    message: `成功上传 ${materials.length} 个文件`,
    data: materials
  });
});

router.get('/:id', auth, (req, res) => {
  const { id } = req.params;
  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);

  if (!material) {
    return res.status(404).json({
      success: false,
      message: '素材不存在'
    });
  }

  if (material.uploader_id !== req.user.id && !material.is_public && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '无权访问此素材'
    });
  }

  res.json({
    success: true,
    data: material
  });
});

router.delete('/:id', auth, (req, res) => {
  const { id } = req.params;
  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);

  if (!material) {
    return res.status(404).json({
      success: false,
      message: '素材不存在'
    });
  }

  if (material.uploader_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '无权删除此素材'
    });
  }

  if (fs.existsSync(material.file_path)) {
    fs.unlinkSync(material.file_path);
  }

  db.prepare('DELETE FROM materials WHERE id = ?').run(id);

  res.json({
    success: true,
    message: '素材已删除'
  });
});

router.delete('/batch', auth, (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供要删除的素材ID'
    });
  }

  const placeholders = ids.map(() => '?').join(',');
  const materials = db.prepare(
    `SELECT * FROM materials WHERE id IN (${placeholders}) AND uploader_id = ?`
  ).all(...ids, req.user.id);

  materials.forEach(m => {
    if (fs.existsSync(m.file_path)) {
      fs.unlinkSync(m.file_path);
    }
  });

  db.prepare(`DELETE FROM materials WHERE id IN (${placeholders}) AND uploader_id = ?`).run(...ids, req.user.id);

  res.json({
    success: true,
    message: `已删除 ${materials.length} 个素材`
  });
});

router.put('/:id/folder', auth, (req, res) => {
  const { id } = req.params;
  const { folderId } = req.body;

  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);

  if (!material) {
    return res.status(404).json({
      success: false,
      message: '素材不存在'
    });
  }

  if (material.uploader_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: '无权移动此素材'
    });
  }

  db.prepare('UPDATE materials SET folder_id = ? WHERE id = ?').run(folderId || 0, id);

  res.json({
    success: true,
    message: '素材已移动'
  });
});

router.get('/stats/usage', auth, (req, res) => {
  const stats = db.prepare(`
    SELECT 
      file_type,
      COUNT(*) as count,
      SUM(file_size) as total_size
    FROM materials 
    WHERE uploader_id = ?
    GROUP BY file_type
  `).all(req.user.id);

  const total = db.prepare('SELECT COUNT(*) as total_count, SUM(file_size) as total_size FROM materials WHERE uploader_id = ?').get(req.user.id);

  res.json({
    success: true,
    data: {
      byType: stats,
      total: total
    }
  });
});

router.post('/folders', auth, (req, res) => {
  const { name, parentId = 0 } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: '文件夹名称不能为空'
    });
  }

  const result = db.prepare(
    'INSERT INTO material_folders (name, parent_id, user_id) VALUES (?, ?, ?)'
  ).run(name, parentId, req.user.id);

  const folder = db.prepare('SELECT * FROM material_folders WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    success: true,
    data: folder
  });
});

router.get('/folders/list', auth, (req, res) => {
  const { parentId = 0 } = req.query;

  const folders = db.prepare(
    'SELECT * FROM material_folders WHERE user_id = ? AND parent_id = ? ORDER BY name'
  ).all(req.user.id, parseInt(parentId));

  res.json({
    success: true,
    data: folders
  });
});

router.delete('/folders/:id', auth, (req, res) => {
  const { id } = req.params;

  const folder = db.prepare('SELECT * FROM material_folders WHERE id = ? AND user_id = ?').get(id, req.user.id);

  if (!folder) {
    return res.status(404).json({
      success: false,
      message: '文件夹不存在'
    });
  }

  db.prepare('UPDATE materials SET folder_id = 0 WHERE folder_id = ?').run(id);

  db.prepare('UPDATE material_folders SET parent_id = 0 WHERE parent_id = ?').run(id);

  db.prepare('DELETE FROM material_folders WHERE id = ?').run(id);

  res.json({
    success: true,
    message: '文件夹已删除'
  });
});

module.exports = router;
