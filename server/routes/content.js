const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { optionalAuth } = require('../middleware/auth');

// 确保 documents 表包含 visibility / published_at 列（迁移可能遗漏）
function ensureColumns() {
  ['visibility TEXT DEFAULT \x27private\x27', 'published_at DATETIME'].forEach((col) => {
    const name = col.split(' ')[0];
    try { db.prepare(`ALTER TABLE documents ADD COLUMN ${col}`).run(); }
    catch { /* column already exists */ }
  });
}
ensureColumns();

// ========== 权限检查辅助函数 ==========

function checkCanView(doc, user) {
  if (user?.role === 'admin' || user?.role === 'superadmin') return true;
  if (doc.author_id === user?.id) return true;
  if (doc.visibility === 'public') return true;
  try {
    const collabs = db.prepare('SELECT user_id FROM collaborators WHERE document_id = ?').all(doc.id).map(r => r.user_id);
    if (collabs.includes(user?.id)) return true;
  } catch {}
  return false;
}

function extractPreview(content) {
  const text = content.replace(/<[^>]*>/g, '');
  return text.substring(0, 200) + (text.length > 200 ? '...' : '');
}

// ========== 公开内容 ==========
// GET /api/content/public
router.get('/public', (req, res) => {
  try {
    const { page = 1, limit = 10, category = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = "status = 'published' AND visibility = 'public'";
    const params = [];
    if (category) { where += ' AND category = ?'; params.push(category); }

    const total = db.prepare(`SELECT COUNT(*) as c FROM documents WHERE ${where}`).get(...params).c;
    const docs = db.prepare(
      `SELECT d.id, d.title, d.summary, d.cover_image, d.author_id, d.version, d.word_count,
              d.created_at, d.updated_at, d.visibility, d.tags, d.category,
              u.username, u.nickname, u.avatar
       FROM documents d LEFT JOIN users u ON d.author_id = u.id
       WHERE ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: {
        list: docs.map(d => ({
          id: d.id, title: d.title, summary: d.summary,
          coverImage: d.cover_image, visibility: d.visibility, category: d.category,
          author: { id: d.author_id, username: d.username, nickname: d.nickname, avatar: d.avatar },
          wordCount: d.word_count, createdAt: d.created_at, updatedAt: d.updated_at,
        })),
        total, page: parseInt(page), limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('获取内容失败:', error);
    res.status(500).json({ success: false, message: '获取内容失败' });
  }
});

router.use('/members', optionalAuth);
router.use('/vip', optionalAuth);
router.use('/my', optionalAuth);
router.use('/:id', optionalAuth);
router.use('/categories', optionalAuth);

router.get('/members', (req, res) => {
  try {
    const { page = 1, limit = 10, category = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 已认证用户
    if (req.user && req.user.isMember) {
      let where = "status = 'published' AND visibility IN ('public', 'members_only', 'vip_only')";
      const params = [];
      if (category) { where += ' AND category = ?'; params.push(category); }

      const total = db.prepare(`SELECT COUNT(*) as c FROM documents WHERE ${where}`).get(...params).c;
      const docs = db.prepare(
        `SELECT d.id, d.title, d.summary, d.cover_image, d.author_id, d.version, d.word_count,
                d.created_at, d.updated_at, d.visibility, d.tags, d.category,
                u.username, u.nickname, u.avatar
         FROM documents d LEFT JOIN users u ON d.author_id = u.id
         WHERE ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?`
      ).all(...params, parseInt(limit), offset);

      res.json({
        success: true,
        data: {
          list: docs.map(d => ({
            id: d.id, title: d.title, summary: d.summary,
            coverImage: d.cover_image, visibility: d.visibility, category: d.category,
            author: { id: d.author_id, username: d.username, nickname: d.nickname, avatar: d.avatar },
            wordCount: d.word_count, createdAt: d.created_at, updatedAt: d.updated_at,
          })),
          total, page: parseInt(page), limit: parseInt(limit),
        },
      });
    } else {
      res.status(403).json({
        success: false, message: '此内容需要会员权限', code: 'MEMBERSHIP_REQUIRED', upgradeUrl: '/membership',
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '获取内容失败' });
  }
});

// ========== VIP 专享内容 ==========
// GET /api/content/vip
router.get('/vip', (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const mem = req.user?.membership?.type || 'free';
    const isVip = ['pro', 'enterprise'].includes(mem);
    if (req.user?.role === 'admin' || req.user?.role === 'superadmin' || isVip) {
      // 管理员或高级会员可以访问
      const where = "status = 'published' AND visibility IN ('members_only', 'vip_only')";
      const total = db.prepare(`SELECT COUNT(*) as c FROM documents WHERE ${where}`).get().c;
      const docs = db.prepare(
        `SELECT d.id, d.title, d.summary, d.cover_image, d.author_id, d.visibility, d.category,
                u.username, u.nickname, u.avatar, d.created_at
         FROM documents d LEFT JOIN users u ON d.author_id = u.id
         WHERE ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?`
      ).all(parseInt(limit), offset);

      res.json({
        success: true,
        data: {
          list: docs.map(d => ({
            id: d.id, title: d.title, summary: d.summary,
            coverImage: d.cover_image, visibility: d.visibility, category: d.category,
            author: { id: d.author_id, username: d.username, nickname: d.nickname, avatar: d.avatar },
            createdAt: d.created_at,
          })),
          total, page: parseInt(page), limit: parseInt(limit),
        },
      });
    } else {
      res.status(403).json({
        success: false, message: '此内容需要Pro或企业版会员', code: 'VIP_REQUIRED', upgradeUrl: '/membership',
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '获取内容失败' });
  }
});

// ========== 文档详情 ==========
// GET /api/content/:id
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const doc = db.prepare(
      `SELECT d.*, u.username, u.nickname, u.avatar, u.role as user_role
       FROM documents d LEFT JOIN users u ON d.author_id = u.id WHERE d.id = ?`
    ).get(id);

    if (!doc) {
      return res.status(404).json({ success: false, message: '文档不存在' });
    }

    // 检查权限
    if (!checkCanView(doc, req.user)) {
      const msg = doc.visibility === 'members_only' ? '此内容需要会员权限' : '无权访问此内容';
      const code = doc.visibility === 'members_only' ? 'MEMBERSHIP_REQUIRED' : undefined;
      return res.status(403).json({
        success: false, message: msg, code, preview: extractPreview(doc.content), upgradeUrl: '/membership',
      });
    }

    let tags = [];
    try { tags = JSON.parse(doc.tags || '[]'); } catch {}

    res.json({
      success: true,
      data: {
        id: doc.id, title: doc.title, content: doc.content, summary: doc.summary,
        author: { id: doc.author_id, username: doc.username, nickname: doc.nickname, avatar: doc.avatar },
        coverImage: doc.cover_image, category: doc.category, tags, visibility: doc.visibility,
        status: doc.status, version: doc.version, wordCount: doc.word_count,
        createdAt: doc.created_at, updatedAt: doc.updated_at, publishedAt: doc.published_at || doc.created_at,
      },
    });

    // 异步增加浏览量
    db.prepare('UPDATE documents SET word_count = word_count WHERE id = ?').run(id);
  } catch (error) {
    console.error('获取文档失败:', error);
    res.status(500).json({ success: false, message: '获取文档失败' });
  }
});

// ========== 创建文档 ==========
// POST /api/content
router.post('/', (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: '请先登录' });

    const limits = user.checkLimits();
    // 检查文档数量
    const docCount = db.prepare('SELECT COUNT(*) as c FROM documents WHERE author_id = ? AND status != ?').get(user.id, 'deleted').c;
    if (docCount >= limits.documents && limits.documents !== -1) {
      return res.status(403).json({
        success: false, message: '文档数量已达上限，请升级会员', code: 'LIMIT_EXCEEDED', upgradeUrl: '/membership',
      });
    }

    const { title = '未命名文档', content = '', summary = '', category = '', cover_image = '', visibility = 'private', tags = '[]' } = req.body;
    if (visibility === 'members_only' && !user.isMember) {
      return res.status(403).json({ success: false, message: '发布会员专享内容需要会员权限' });
    }
    if (visibility === 'vip_only' && !['pro', 'enterprise'].includes(user.membership?.type || 'free')) {
      return res.status(403).json({ success: false, message: '发布VIP专享内容需要Pro或企业版会员' });
    }

    const id = uuidv4();
    const plainText = content.replace(/<[^>]*>/g, '');
    db.prepare(
      `INSERT INTO documents (id, title, content, summary, author_id, cover_image, category, tags, status, visibility, word_count, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, 1)`
    ).run(id, title, content, summary, user.id, cover_image, category, typeof tags === 'string' ? tags : JSON.stringify(tags), visibility, plainText.length);

    res.status(201).json({
      success: true, message: '文档创建成功', data: { id, title, status: 'draft' },
    });
  } catch (error) {
    console.error('创建文档失败:', error);
    res.status(500).json({ success: false, message: '创建文档失败' });
  }
});

// ========== 更新文档 ==========
// PUT /api/content/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: '请先登录' });

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    if (!doc) return res.status(404).json({ success: false, message: '文档不存在' });

    const isAuthor = doc.author_id === user.id;
    const isCollab = db.prepare('SELECT 1 FROM collaborators WHERE document_id = ? AND user_id = ?').get(id, user.id);
    const isAdmin = ['admin', 'superadmin'].includes(user.role);
    if (!isAuthor && !isCollab && !isAdmin) {
      return res.status(403).json({ success: false, message: '无权编辑此文档' });
    }

    const { title, content, summary, category, cover_image, visibility, status, tags } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (content !== undefined) {
      updates.push('content = ?'); params.push(content);
      const plainText = content.replace(/<[^>]*>/g, '');
      updates.push('word_count = ?'); params.push(plainText.length);
    }
    if (summary !== undefined) { updates.push('summary = ?'); params.push(summary); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (cover_image !== undefined) { updates.push('cover_image = ?'); params.push(cover_image); }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(typeof tags === 'string' ? tags : JSON.stringify(tags)); }
    if (status !== undefined) {
      updates.push('status = ?'); params.push(status);
      if (status === 'published') updates.push("published_at = COALESCE(published_at, CURRENT_TIMESTAMP)");
    }

    if (visibility !== undefined) {
      if (visibility === 'members_only' && !user.isMember) {
        return res.status(403).json({ success: false, message: '发布会员专享内容需要会员权限' });
      }
      if (visibility === 'vip_only' && !['pro', 'enterprise'].includes(user.membership?.type || 'free')) {
        return res.status(403).json({ success: false, message: '发布VIP专享内容需要Pro或企业版会员' });
      }
      updates.push('visibility = ?'); params.push(visibility);
    }

    if (updates.length === 0) return res.json({ success: true, data: { id, version: doc.version } });

    updates.push('version = version + 1');
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    db.prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    res.json({ success: true, message: '文档更新成功', data: { id: updated.id, version: updated.version, updatedAt: updated.updated_at } });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新文档失败' });
  }
});

// ========== 删除文档 ==========
// DELETE /api/content/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: '请先登录' });

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    if (!doc) return res.status(404).json({ success: false, message: '文档不存在' });

    if (doc.author_id !== user.id && !['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ success: false, message: '无权删除此文档' });
    }

    db.prepare("UPDATE documents SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    res.json({ success: true, message: '文档已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// ========== 我的文档 ==========
// GET /api/content/my
router.get('/my', (req, res) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'author_id = ?';
    const params = [req.user?.id];
    if (status) { where += ' AND status = ?'; params.push(status); }
    else { where += " AND status != 'deleted'"; }

    const total = db.prepare(`SELECT COUNT(*) as c FROM documents WHERE ${where}`).get(...params).c;
    const docs = db.prepare(
      `SELECT * FROM documents WHERE ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: { list: docs, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取文档失败' });
  }
});

// ========== 添加协作者 ==========
// POST /api/content/:id/collaborators
router.post('/:id/collaborators', (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role = 'viewer' } = req.body;
    const user = req.user;

    if (!user) return res.status(401).json({ success: false, message: '请先登录' });

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    if (!doc) return res.status(404).json({ success: false, message: '文档不存在' });
    if (doc.author_id !== user.id) return res.status(403).json({ success: false, message: '只有作者可以添加协作者' });

    const exists = db.prepare('SELECT 1 FROM collaborators WHERE document_id = ? AND user_id = ?').get(id, userId);
    if (exists) return res.status(409).json({ success: false, message: '该用户已是协作者' });

    db.prepare('INSERT INTO collaborators (document_id, user_id, role) VALUES (?, ?, ?)').run(id, userId, role);
    res.json({ success: true, message: '协作者添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加失败' });
  }
});

// ========== 获取分类列表 ==========
// GET /api/content/categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare("SELECT DISTINCT category FROM documents WHERE status = 'published' AND category != '' AND category IS NOT NULL").all();
    res.json({ success: true, data: categories.map(c => c.category) });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取分类失败' });
  }
});

module.exports = router;
