const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authLite } = require('../middleware/auth');

// 所有文档操作都需要认证（轻量级，不依赖 MongoDB）
router.use(authLite);

/**
 * 创建新文档
 * POST /api/collab/documents
 */
router.post('/documents', (req, res) => {
  const { title, content = '' } = req.body;

  // 会员文档数量限额检查（轻量版，不依赖 MongoDB）
  try {
    const FREE_DOC_LIMIT = 10;
    const { count } = db.prepare(
      "SELECT COUNT(*) as count FROM documents WHERE author_id = ? AND status != 'deleted'"
    ).get(req.userId);
    if (count >= FREE_DOC_LIMIT) {
      // TODO: 后续可通过 MongoDB 查询会员类型来动态调整限额
      return res.status(403).json({
        success: false,
        message: `免费版最多创建 ${FREE_DOC_LIMIT} 个文档，请升级会员`,
        code: 'DOCUMENT_LIMIT_REACHED',
        upgradeUrl: '/membership',
      });
    }
  } catch (e) {
    // 限额检查失败不影响创建
    console.warn('文档限额检查跳过:', e.message);
  }

  const id = uuidv4();
  const stmt = db.prepare(
    'INSERT INTO documents (id, title, content, author_id) VALUES (?, ?, ?, ?)'
  );

  try {
    stmt.run(id, title || '未命名文档', content, req.userId);
    res.json({
      success: true,
      message: '文档创建成功',
      data: { id, title: title || '未命名文档' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取当前用户的文档列表
 * GET /api/collab/documents
 */
router.get('/documents', (req, res) => {
  const { page = 1, limit = 20, search = '', status = '' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // 查询当前用户自己的文档 + 作为协作者的文档
  let sql = `SELECT d.* FROM documents d WHERE (d.author_id = ? OR d.id IN (SELECT document_id FROM collaborators WHERE user_id = ?))`;
  const params = [req.userId, req.userId];

  // 如果指定了状态，查该状态；否则排除已删除的
  if (status) {
    sql += ' AND d.status = ?';
    params.push(status);
  } else {
    sql += " AND d.status != 'deleted'";
  }

  if (search) {
    sql += ' AND (d.title LIKE ? OR d.content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // 获取总数
  const countSql = sql.replace('SELECT d.*', 'SELECT COUNT(*) as total');
  const { total } = db.prepare(countSql).get(...params);

  // 获取分页数据
  sql += ' ORDER BY d.updated_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const docs = db.prepare(sql).all(...params);

  res.json({
    success: true,
    data: {
      list: docs,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    }
  });
});

/**
 * 获取文档详情（owner 或协作者均可访问）
 * GET /api/collab/documents/:documentId
 */
router.get('/documents/:documentId', (req, res) => {
  const { documentId } = req.params;

  // 先查文档是否存在
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId);
  if (!doc) {
    return res.status(404).json({ success: false, message: '文档不存在' });
  }

  // 权限校验：owner 或 collaborator
  const isOwner = String(doc.author_id) === String(req.userId);
  const isCollaborator = db.prepare(
    'SELECT 1 FROM collaborators WHERE document_id = ? AND user_id = ?'
  ).get(documentId, req.userId);
  if (!isOwner && !isCollaborator) {
    return res.status(404).json({ success: false, message: '文档不存在' });
  }

  res.json({ success: true, data: doc });
});

/**
 * 更新文档（仅限自己的文档）
 * PUT /api/collab/documents/:documentId
 */
router.put('/documents/:documentId', (req, res) => {
  const { documentId } = req.params;
  const { title, content, summary, status, cover_image, tags } = req.body;

  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND author_id = ?').get(documentId, req.userId);
  if (!doc) {
    return res.status(404).json({ success: false, message: '文档不存在' });
  }

  // 动态构建更新语句
  const updates = [];
  const params = [];

  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  if (content !== undefined) {
    updates.push('content = ?');
    params.push(content);
    // 更新字数
    const plainText = content.replace(/<[^>]*>/g, '');
    updates.push('word_count = ?');
    params.push(plainText.length);
  }
  if (summary !== undefined) { updates.push('summary = ?'); params.push(summary); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (cover_image !== undefined) { updates.push('cover_image = ?'); params.push(cover_image); }
  if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }

  updates.push('version = version + 1');
  updates.push('updated_at = CURRENT_TIMESTAMP');

  params.push(documentId);

  db.prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId);
  res.json({
    success: true,
    message: '文档更新成功',
    data: updated
  });
});

/**
 * 删除文档（软删除，仅限自己的文档）
 * DELETE /api/collab/documents/:documentId
 */
router.delete('/documents/:documentId', (req, res) => {
  const { documentId } = req.params;

  const result = db.prepare(
    "UPDATE documents SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND author_id = ?"
  ).run(documentId, req.userId);

  if (result.changes === 0) {
    return res.status(404).json({ success: false, message: '文档不存在' });
  }

  res.json({ success: true, message: '文档已删除' });
});

/**
 * 获取文档版本历史
 * GET /api/collab/documents/:documentId/history
 */
router.get('/documents/:documentId/history', (req, res) => {
  const { documentId } = req.params;
  const { limit = 20 } = req.query;

  // 先验证文档属于当前用户
  const doc = db.prepare('SELECT id FROM documents WHERE id = ? AND author_id = ?').get(documentId, req.userId);
  if (!doc) {
    return res.status(404).json({ success: false, message: '文档不存在' });
  }

  const history = db.prepare(
    'SELECT * FROM document_versions WHERE document_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(documentId, parseInt(limit));

  res.json({ success: true, data: history });
});

/**
 * 生成分享链接
 * POST /api/collab/documents/:documentId/share
 */
router.post('/documents/:documentId/share', (req, res) => {
  const { documentId } = req.params;

  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND author_id = ?').get(documentId, req.userId);
  if (!doc) {
    return res.status(404).json({ success: false, message: '文档不存在' });
  }

  const shareUrl = `${req.protocol}://${req.get('host')}/collab/${documentId}`;
  res.json({
    success: true,
    data: { shareUrl }
  });
});

module.exports = router;

