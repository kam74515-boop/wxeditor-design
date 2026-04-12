const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

function ensureTeamTables() {
  try {
    db.prepare(`CREATE TABLE IF NOT EXISTS sqlite_teams (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, team_id TEXT REFERENCES sqlite_teams(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member', joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, user_id)
    )`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS team_invitations (
      id TEXT PRIMARY KEY, team_id TEXT REFERENCES sqlite_teams(id) ON DELETE CASCADE,
      inviter_id INTEGER REFERENCES users(id), email TEXT NOT NULL, role TEXT DEFAULT 'member',
      status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, email)
    )`).run();
  } catch (e) { console.error('Team tables init:', e.message); }
}
ensureTeamTables();

const jwtAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: '请先登录' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.user = { id: decoded.id };
    next();
  } catch { res.status(401).json({ success: false, message: '登录已过期' }); }
};

router.use(jwtAuth);

router.get('/teams', (req, res) => {
  try {
    const userId = req.userId;
    const teams = db.prepare(`
      SELECT t.id, t.name, t.owner_id, t.created_at,
        CASE WHEN t.owner_id = ? THEN 'owner' ELSE m.role END AS role
      FROM sqlite_teams t
      LEFT JOIN team_members m ON m.team_id = t.id AND m.user_id = ?
      WHERE t.owner_id = ? OR m.user_id = ?
    `).all(userId, userId, userId, userId);

    const result = teams.map(team => {
      const members = db.prepare(`
        SELECT tm.user_id, tm.role, tm.joined_at, u.username, u.nickname, u.avatar
        FROM team_members tm LEFT JOIN users u ON tm.user_id = u.id WHERE tm.team_id = ?
      `).all(team.id);
      return { ...team, members };
    });

    res.json({ success: true, data: result, message: '获取成功' });
  } catch (error) {
    console.error('获取团队列表失败:', error);
    res.status(500).json({ success: false, message: '获取团队列表失败' });
  }
});

router.post('/teams', (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ success: false, data: null, message: '缺少名称' });

    const id = uuidv4();
    db.prepare('INSERT INTO sqlite_teams (id, name, owner_id) VALUES (?, ?, ?)').run(id, name, req.userId);
    db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)').run(id, req.userId, 'owner');

    const team = db.prepare(`
      SELECT t.id, t.name, t.owner_id, t.created_at,
        json_group_array(json_object('userId', tm.user_id, 'role', tm.role)) AS members
      FROM sqlite_teams t LEFT JOIN team_members tm ON tm.team_id = t.id WHERE t.id = ? GROUP BY t.id
    `).get(id);

    res.json({ success: true, data: team, message: '团队创建成功' });
  } catch (error) {
    console.error('创建团队失败:', error);
    res.status(500).json({ success: false, message: '创建团队失败' });
  }
});

router.get('/teams/:id', (req, res) => {
  try {
    const team = db.prepare('SELECT * FROM sqlite_teams WHERE id = ?').get(req.params.id);
    if (!team) return res.status(404).json({ success: false, data: null, message: '团队未找到' });

    const member = db.prepare('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?').get(team.id, req.userId);
    if (team.owner_id !== req.userId && !member) {
      return res.status(403).json({ success: false, data: null, message: '无访问权限' });
    }

    const members = db.prepare(`
      SELECT tm.user_id, tm.role, tm.joined_at, u.username, u.nickname, u.avatar
      FROM team_members tm LEFT JOIN users u ON tm.user_id = u.id WHERE tm.team_id = ?
    `).all(team.id);

    const invitations = db.prepare("SELECT * FROM team_invitations WHERE team_id = ? AND status = 'pending'").all(team.id);

    res.json({ success: true, data: { ...team, members, invitations }, message: '获取成功' });
  } catch (error) {
    res.status(500).json({ success: false, data: null, message: '服务器错误' });
  }
});

router.put('/teams/:id', (req, res) => {
  try {
    const team = db.prepare('SELECT * FROM sqlite_teams WHERE id = ?').get(req.params.id);
    if (!team) return res.status(404).json({ success: false, data: null, message: '团队未找到' });
    if (team.owner_id !== req.userId) return res.status(403).json({ success: false, data: null, message: '仅拥有者可更新' });

    const { name } = req.body || {};
    if (name) db.prepare('UPDATE sqlite_teams SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, team.id);

    const updated = db.prepare('SELECT * FROM sqlite_teams WHERE id = ?').get(team.id);
    res.json({ success: true, data: updated, message: '更新成功' });
  } catch {
    res.status(500).json({ success: false, data: null, message: '服务器错误' });
  }
});

router.delete('/teams/:id', (req, res) => {
  try {
    const team = db.prepare('SELECT * FROM sqlite_teams WHERE id = ?').get(req.params.id);
    if (!team) return res.status(404).json({ success: false, data: null, message: '团队未找到' });
    if (team.owner_id !== req.userId) return res.status(403).json({ success: false, data: null, message: '仅拥有者可删除' });

    db.prepare('DELETE FROM team_members WHERE team_id = ?').run(team.id);
    db.prepare('DELETE FROM team_invitations WHERE team_id = ?').run(team.id);
    db.prepare('DELETE FROM sqlite_teams WHERE id = ?').run(team.id);
    res.json({ success: true, data: null, message: '删除成功' });
  } catch {
    res.status(500).json({ success: false, data: null, message: '服务器错误' });
  }
});

router.post('/teams/:id/invite', (req, res) => {
  try {
    const team = db.prepare('SELECT * FROM sqlite_teams WHERE id = ?').get(req.params.id);
    if (!team) return res.status(404).json({ success: false, data: null, message: '团队未找到' });

    const owner = team.owner_id === req.userId;
    const adminCheck = db.prepare("SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ? AND role = 'admin'").get(team.id, req.userId);
    if (!owner && !adminCheck) return res.status(403).json({ success: false, data: null, message: '仅拥有者或管理员可邀请成员' });

    const { email, role } = req.body || {};
    if (!email) return res.status(400).json({ success: false, data: null, message: '缺少邀请邮箱' });

    const code = 'INV_' + req.params.id + '_' + Date.now();
    try {
      db.prepare('INSERT INTO team_invitations (id, team_id, inviter_id, email, role, status) VALUES (?, ?, ?, ?, ?, ?)').run(
        code, team.id, req.userId, email, role || 'member', 'pending'
      );
    } catch {
      return res.status(409).json({ success: false, data: null, message: '该用户已被邀请' });
    }
    res.json({ success: true, data: { code, email }, message: '邀请发送成功' });
  } catch {
    res.status(500).json({ success: false, data: null, message: '服务器错误' });
  }
});

router.post('/invitations/:code/accept', (req, res) => {
  try {
    const invitation = db.prepare(`SELECT * FROM team_invitations WHERE id = ? AND status = 'pending'`).get(req.params.code);
    if (!invitation) return res.status(404).json({ success: false, data: null, message: '邀请不存在' });
    if (invitation.email !== req.user?.email && invitation.email !== req.body?.userEmail) {
      return res.status(403).json({ success: false, data: null, message: '邀请邮箱不匹配' });
    }

    const team = db.prepare('SELECT * FROM sqlite_teams WHERE id = ?').get(invitation.team_id);
    const existing = db.prepare('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?').get(team.id, req.userId);
    if (!existing) {
      db.prepare('INSERT OR IGNORE INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)').run(team.id, req.userId, invitation.role || 'member');
    }

    db.prepare("UPDATE team_invitations SET status = 'accepted' WHERE id = ?").run(req.params.code);
    res.json({ success: true, data: team, message: '已加入团队' });
  } catch {
    res.status(500).json({ success: false, data: null, message: '服务器错误' });
  }
});

router.post('/invitations/:code/reject', (req, res) => {
  try {
    const invitation = db.prepare('SELECT * FROM team_invitations WHERE id = ?').get(req.params.code);
    if (!invitation) return res.status(404).json({ success: false, data: null, message: '邀请不存在' });

    db.prepare("UPDATE team_invitations SET status = 'rejected' WHERE id = ?").run(req.params.code);
    res.json({ success: true, data: null, message: '邀请已拒绝' });
  } catch {
    res.status(500).json({ success: false, data: null, message: '服务器错误' });
  }
});

router.get('/invitations', (req, res) => {
  try {
    const results = db.prepare(`
      SELECT ti.id as code, ti.team_id as teamId, t.name as teamName, ti.inviter_id as invitedBy, ti.email, ti.status
      FROM team_invitations ti JOIN sqlite_teams t ON ti.team_id = t.id
      WHERE ti.email = ?
    `).all(req.user?.email || '');
    res.json({ success: true, data: results, message: '邀请列表获取成功' });
  } catch {
    res.status(500).json({ success: false, data: null, message: '服务器错误' });
  }
});

router.put('/teams/:id/members/:memberId', (req, res) => {
  try {
    const team = db.prepare('SELECT * FROM sqlite_teams WHERE id = ?').get(req.params.id);
    if (!team) return res.status(404).json({ success: false, data: null, message: '团队未找到' });

    const isAdmin = team.owner_id === req.userId || db.prepare("SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ? AND role = 'admin'").get(team.id, req.userId);
    if (!isAdmin) return res.status(403).json({ success: false, data: null, message: '需要拥有者/管理员权限' });

    const member = db.prepare('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?').get(team.id, req.params.memberId);
    if (!member) return res.status(404).json({ success: false, data: null, message: '成员未找到' });

    const { role } = req.body || {};
    if (role) db.prepare('UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?').run(role, team.id, req.params.memberId);
    res.json({ success: true, data: team, message: '成员角色更新成功' });
  } catch {
    res.status(500).json({ success: false, data: null, message: '服务器错误' });
  }
});

router.delete('/teams/:id/members/:memberId', (req, res) => {
  try {
    const team = db.prepare('SELECT * FROM sqlite_teams WHERE id = ?').get(req.params.id);
    if (!team) return res.status(404).json({ success: false, data: null, message: '团队未找到' });

    const isAdmin = team.owner_id === req.userId || db.prepare("SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ? AND role = 'admin'").get(team.id, req.userId);
    if (!isAdmin) return res.status(403).json({ success: false, data: null, message: '需要拥有者/管理员权限' });
    if (team.owner_id === parseInt(req.params.memberId)) return res.status(400).json({ success: false, data: null, message: '不可移除团队拥有者' });

    const result = db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(team.id, req.params.memberId);
    if (result.changes === 0) return res.status(404).json({ success: false, data: null, message: '成员未找到' });
    res.json({ success: true, data: team, message: '成员移除成功' });
  } catch {
    res.status(500).json({ success: false, data: null, message: '服务器错误' });
  }
});

module.exports = router;
