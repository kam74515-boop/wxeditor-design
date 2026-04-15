const db = require('../config/db');

async function getUserPermissions(userId) {
  const perms = await db('user_roles as ur')
    .join('roles as r', 'ur.role_id', 'r.id')
    .where('ur.user_id', userId)
    .select('r.permissions');

  const merged = {};
  for (const row of perms) {
    const rolePerms = typeof row.permissions === 'string'
      ? JSON.parse(row.permissions) : row.permissions;
    Object.assign(merged, rolePerms);
  }
  return merged;
}

function requirePermission(resource, action) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });

    const systemRoles = ['admin', 'superadmin'];
    if (systemRoles.includes(req.user.role)) return next();

    try {
      const perms = await getUserPermissions(req.user.id);
      const resourcePerms = perms[resource];
      if (resourcePerms && (resourcePerms === '*' || (Array.isArray(resourcePerms) && resourcePerms.includes(action)))) {
        return next();
      }
      res.status(403).json({ success: false, message: '权限不足' });
    } catch (err) {
      console.error('RBAC check error:', err);
      res.status(500).json({ success: false, message: '权限检查失败' });
    }
  };
}

function requireOwnerOrAdmin(getOwnerId) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const ownerId = typeof getOwnerId === 'function' ? getOwnerId(req) : req.params[getOwnerId];
    if (String(req.user.id) === String(ownerId) || ['admin', 'superadmin'].includes(req.user.role)) {
      return next();
    }
    res.status(403).json({ success: false, message: '权限不足' });
  };
}

module.exports = { getUserPermissions, requirePermission, requireOwnerOrAdmin };
