const db = require('../config/db');
const UserRepo = require('../repositories/user.repo');
const DocumentRepo = require('../repositories/document.repo');

const AdminService = {
  async getDashboard() {
    const [totalUsers] = await db('users').count('* as count');
    const [activeUsers] = await db('users').where({ status: 'active' }).count('* as count');
    const [totalDocs] = await db('documents').whereNot('status', 'deleted').count('* as count');
    const [publishedDocs] = await db('documents').where({ status: 'published' }).count('* as count');
    const [todayOrders] = await db.raw("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue FROM orders WHERE payment_status = 'paid' AND DATE(paid_at) = CURDATE()");
    const [monthRevenue] = await db.raw("SELECT COALESCE(SUM(amount), 0) as revenue FROM orders WHERE payment_status = 'paid' AND MONTH(paid_at) = MONTH(CURDATE()) AND YEAR(paid_at) = YEAR(CURDATE())");

    return {
      users: { total: totalUsers.count, active: activeUsers.count },
      documents: { total: totalDocs.count, published: publishedDocs.count },
      revenue: { today: parseFloat(todayOrders.revenue || 0), thisMonth: parseFloat(monthRevenue.revenue || 0), todayOrders: todayOrders.count },
    };
  },

  async listUsers({ page = 1, limit = 20, search, role, status } = {}) {
    return UserRepo.list({ page, limit, search, role, status });
  },

  async getUser(id) {
    return UserRepo.findById(id);
  },

  async updateUser(id, data) {
    const updates = {};
    if (data.role !== undefined) updates.role = data.role;
    if (data.status !== undefined) updates.status = data.status;
    return UserRepo.update(id, updates);
  },

  async banUser(id) {
    return UserRepo.update(id, { status: 'banned' });
  },

  async unbanUser(id) {
    return UserRepo.update(id, { status: 'active' });
  },

  async listDocuments({ page = 1, limit = 20, search, status } = {}) {
    return DocumentRepo.list({ page, limit, search, status });
  },

  async deleteDocument(id) {
    await DocumentRepo.softDelete(id);
  },

  async listOrders({ page = 1, limit = 20, status } = {}) {
    const query = db('orders as o').leftJoin('users as u', 'o.user_id', 'u.id')
      .select('o.*', 'u.username', 'u.email');
    if (status) query.where('o.payment_status', status);
    const [{ count }] = await query.clone().clearSelect().clearOrder().count('* as count');
    const list = await query.orderBy('o.created_at', 'desc').limit(limit).offset((page - 1) * limit);
    return { list, total: count, page, limit };
  },

  async refundOrder(id, { amount, reason }) {
    await db('orders').where({ id }).update({
      payment_status: 'refunded',
      refund_amount: amount,
      refund_reason: reason,
      refunded_at: new Date(),
    });
  },

  async getSettings() {
    const rows = await db('system_settings').select('key', 'value', 'group', 'description');
    const settings = {};
    for (const row of rows) {
      const group = row.group || 'general';
      if (!settings[group]) settings[group] = {};
      try { settings[group][row.key] = JSON.parse(row.value); }
      catch { settings[group][row.key] = row.value; }
    }
    return settings;
  },

  async updateSettings(updates) {
    for (const [key, value] of Object.entries(updates)) {
      await db('system_settings')
        .insert({ key, value: JSON.stringify(value), group: 'general' })
        .onConflict('key')
        .merge({ value: JSON.stringify(value), updated_at: new Date() });
    }
  },
};

module.exports = AdminService;
