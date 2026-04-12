const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, optionalAuth, restrictTo } = require('../middleware/auth');

router.get('/', optionalAuth, (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    category = '', 
    search = '',
    isPublic = ''
  } = req.query;
  
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let sql = 'SELECT * FROM templates WHERE status = ?';
  const params = ['active'];

  if (isPublic === '1') {
    sql += ' AND is_public = 1';
  } else if (isPublic === '0' && req.user) {
    sql += ' AND author_id = ?';
    params.push(req.user.id);
  } else {
    sql += ' AND (is_public = 1 OR author_id = ?)';
    params.push(req.user?.id || 0);
  }

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ? OR tags LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const { total } = db.prepare(countSql).get(...params);

  sql += ' ORDER BY use_count DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const templates = db.prepare(sql).all(...params);

  res.json({
    success: true,
    data: {
      list: templates,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    }
  });
});

router.get('/categories', (req, res) => {
  const categories = db.prepare(
    'SELECT DISTINCT category, COUNT(*) as count FROM templates WHERE status = ? GROUP BY category ORDER BY count DESC'
  ).all('active');

  res.json({
    success: true,
    data: categories
  });
});

router.get('/:id', optionalAuth, (req, res) => {
  const { id } = req.params;
  const template = db.prepare('SELECT * FROM templates WHERE id = ? AND status = ?').get(id, 'active');

  if (!template) {
    return res.status(404).json({
      success: false,
      message: '模板不存在'
    });
  }

  if (!template.is_public && (!req.user || req.user.id !== template.author_id)) {
    return res.status(403).json({
      success: false,
      message: '无权访问此模板'
    });
  }

  res.json({
    success: true,
    data: template
  });
});

router.post('/', auth, (req, res) => {
  const { 
    name, 
    description = '', 
    category = 'general', 
    content, 
    previewImage = '', 
    tags = [], 
    isPublic = false 
  } = req.body;

  if (!name || !content) {
    return res.status(400).json({
      success: false,
      message: '模板名称和内容不能为空'
    });
  }

  const result = db.prepare(
    'INSERT INTO templates (name, description, category, content, preview_image, tags, is_public, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(name, description, category, content, previewImage, JSON.stringify(tags), isPublic ? 1 : 0, req.user.id);

  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    success: true,
    message: '模板创建成功',
    data: template
  });
});

router.put('/:id', auth, (req, res) => {
  const { id } = req.params;
  const { name, description, category, content, previewImage, tags, isPublic } = req.body;

  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
  
  if (!template) {
    return res.status(404).json({
      success: false,
      message: '模板不存在'
    });
  }

  if (template.author_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '无权修改此模板'
    });
  }

  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (category !== undefined) { updates.push('category = ?'); params.push(category); }
  if (content !== undefined) { updates.push('content = ?'); params.push(content); }
  if (previewImage !== undefined) { updates.push('preview_image = ?'); params.push(previewImage); }
  if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }
  if (isPublic !== undefined) { updates.push('is_public = ?'); params.push(isPublic ? 1 : 0); }

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: '没有要更新的字段'
    });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  db.prepare(`UPDATE templates SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
  res.json({
    success: true,
    message: '模板更新成功',
    data: updated
  });
});

router.delete('/:id', auth, (req, res) => {
  const { id } = req.params;
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
  
  if (!template) {
    return res.status(404).json({
      success: false,
      message: '模板不存在'
    });
  }

  if (template.author_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '无权删除此模板'
    });
  }

  db.prepare("UPDATE templates SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

  res.json({
    success: true,
    message: '模板已删除'
  });
});

router.post('/:id/use', (req, res) => {
  const { id } = req.params;
  
  db.prepare('UPDATE templates SET use_count = use_count + 1 WHERE id = ?').run(id);

  res.json({
    success: true,
    message: '使用次数已更新'
  });
});

router.post('/:id/clone', auth, (req, res) => {
  const { id } = req.params;
  const template = db.prepare('SELECT * FROM templates WHERE id = ? AND status = ?').get(id, 'active');

  if (!template) {
    return res.status(404).json({
      success: false,
      message: '模板不存在'
    });
  }

  const result = db.prepare(
    'INSERT INTO templates (name, description, category, content, preview_image, tags, is_public, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    `${template.name} (副本)`,
    template.description,
    template.category,
    template.content,
    template.preview_image,
    template.tags,
    0,
    req.user.id
  );

  const cloned = db.prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    success: true,
    message: '模板克隆成功',
    data: cloned
  });
});

module.exports = router;
