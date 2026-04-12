/**
 * AI API 动态配置路由
 * 
 * 管理 AI 服务的供应商配置、密钥和模型参数
 * 仅限 admin/superadmin 角色访问
 */
const express = require('express');
const router = express.Router();
const { auth, restrictTo } = require('../middleware/auth');

// 获取数据库连接（兼容新旧接口）
function getDB() {
  const database = require('../config/database');
  return database.db || database;
}

/**
 * GET /api/admin/ai-configs/active
 * 获取当前活跃的 AI 配置（供 AI 路由使用）
 * 注意：此路由必须在 /:id 前面，避免被参数路由捕获
 */
router.get('/active', auth, (req, res) => {
  try {
    const db = getDB();
    const config = db.prepare('SELECT * FROM ai_configs WHERE is_active = 1').get();
    if (!config) {
      return res.status(404).json({ error: '没有活跃的 AI 配置' });
    }
    // 不返回 api_key
    const { api_key, ...safeConfig } = config;
    safeConfig.extra_params = JSON.parse(safeConfig.extra_params || '{}');
    res.json({ data: safeConfig });
  } catch (err) {
    console.error('获取活跃 AI 配置失败:', err);
    res.status(500).json({ error: '获取失败' });
  }
});

/**
 * GET /api/admin/ai-configs
 * 获取所有 AI 供应商配置（脱敏 API Key）
 */
router.get('/', auth, restrictTo('admin', 'superadmin'), (req, res) => {
  try {
    const db = getDB();
    const configs = db.prepare(`
      SELECT id, name, provider, base_url, model,
             temperature, max_tokens, top_p,
             is_active, status, extra_params,
             created_at, updated_at
      FROM ai_configs
      ORDER BY is_active DESC, created_at DESC
    `).all();

    // 脱敏 API Key
    const safeConfigs = configs.map((c) => ({
      ...c,
      api_key_masked: '****' + (c.api_key || '').slice(-4),
      extra_params: JSON.parse(c.extra_params || '{}'),
    }));

    res.json({ data: safeConfigs });
  } catch (err) {
    console.error('获取 AI 配置失败:', err);
    res.status(500).json({ error: '获取 AI 配置失败' });
  }
});

/**
 * GET /api/admin/ai-configs/:id
 * 获取单个配置详情（含完整 API Key, 仅 superadmin）
 */
router.get('/:id', auth, restrictTo('admin', 'superadmin'), (req, res) => {
  try {
    const db = getDB();
    const config = db.prepare('SELECT * FROM ai_configs WHERE id = ?').get(req.params.id);
    if (!config) {
      return res.status(404).json({ error: 'AI 配置不存在' });
    }

    // 非 superadmin 脱敏 Key
    if (req.user.role !== 'superadmin') {
      config.api_key = '****' + config.api_key.slice(-4);
    }
    config.extra_params = JSON.parse(config.extra_params || '{}');

    res.json({ data: config });
  } catch (err) {
    console.error('获取 AI 配置详情失败:', err);
    res.status(500).json({ error: '获取失败' });
  }
});

/**
 * POST /api/admin/ai-configs
 * 添加新的 AI 供应商配置
 */
router.post('/', auth, restrictTo('admin', 'superadmin'), (req, res) => {
  try {
    const db = getDB();
    const { name, provider, api_key, base_url, model, temperature, max_tokens, top_p, extra_params } = req.body;

    // 参数验证
    if (!name || !provider || !api_key || !base_url || !model) {
      return res.status(400).json({ error: '必填字段: name, provider, api_key, base_url, model' });
    }

    const result = db.prepare(`
      INSERT INTO ai_configs (name, provider, api_key, base_url, model, temperature, max_tokens, top_p, extra_params)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, provider, api_key, base_url, model,
      temperature || 0.7, max_tokens || 4096, top_p || 0.95,
      JSON.stringify(extra_params || {})
    );

    res.status(201).json({
      message: 'AI 供应商配置已创建',
      data: { id: result.lastInsertRowid },
    });
  } catch (err) {
    console.error('创建 AI 配置失败:', err);
    res.status(500).json({ error: '创建失败' });
  }
});

/**
 * PUT /api/admin/ai-configs/:id
 * 更新 AI 供应商配置
 */
router.put('/:id', auth, restrictTo('admin', 'superadmin'), (req, res) => {
  try {
    const db = getDB();
    const existing = db.prepare('SELECT id FROM ai_configs WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'AI 配置不存在' });
    }

    const { name, provider, api_key, base_url, model, temperature, max_tokens, top_p, extra_params } = req.body;

    // 构建动态更新字段
    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (provider !== undefined) { updates.push('provider = ?'); values.push(provider); }
    if (api_key !== undefined) { updates.push('api_key = ?'); values.push(api_key); }
    if (base_url !== undefined) { updates.push('base_url = ?'); values.push(base_url); }
    if (model !== undefined) { updates.push('model = ?'); values.push(model); }
    if (temperature !== undefined) { updates.push('temperature = ?'); values.push(temperature); }
    if (max_tokens !== undefined) { updates.push('max_tokens = ?'); values.push(max_tokens); }
    if (top_p !== undefined) { updates.push('top_p = ?'); values.push(top_p); }
    if (extra_params !== undefined) { updates.push('extra_params = ?'); values.push(JSON.stringify(extra_params)); }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    db.prepare(`UPDATE ai_configs SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    res.json({ message: 'AI 配置已更新' });
  } catch (err) {
    console.error('更新 AI 配置失败:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * POST /api/admin/ai-configs/:id/activate
 * 切换活跃的 AI 供应商（同时停用其他）
 */
router.post('/:id/activate', auth, restrictTo('admin', 'superadmin'), (req, res) => {
  try {
    const db = getDB();
    const config = db.prepare('SELECT id, name FROM ai_configs WHERE id = ?').get(req.params.id);
    if (!config) {
      return res.status(404).json({ error: 'AI 配置不存在' });
    }

    // 事务：停用所有 → 激活目标
    const activate = db.transaction(() => {
      db.prepare('UPDATE ai_configs SET is_active = 0, status = \'standby\', updated_at = CURRENT_TIMESTAMP').run();
      db.prepare('UPDATE ai_configs SET is_active = 1, status = \'connected\', updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    });
    activate();

    res.json({ message: `已切换活跃供应商为: ${config.name}` });
  } catch (err) {
    console.error('切换 AI 供应商失败:', err);
    res.status(500).json({ error: '切换失败' });
  }
});

/**
 * DELETE /api/admin/ai-configs/:id
 * 删除 AI 供应商配置
 */
router.delete('/:id', auth, restrictTo('admin', 'superadmin'), (req, res) => {
  try {
    const db = getDB();
    const config = db.prepare('SELECT id, is_active FROM ai_configs WHERE id = ?').get(req.params.id);
    if (!config) {
      return res.status(404).json({ error: 'AI 配置不存在' });
    }
    if (config.is_active) {
      return res.status(400).json({ error: '不能删除当前活跃的供应商' });
    }

    db.prepare('DELETE FROM ai_configs WHERE id = ?').run(req.params.id);
    res.json({ message: 'AI 配置已删除' });
  } catch (err) {
    console.error('删除 AI 配置失败:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
