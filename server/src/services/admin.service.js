const nodemailer = require('nodemailer');
const db = require('../config/db');
const UserRepo = require('../repositories/user.repo');
const DocumentRepo = require('../repositories/document.repo');
const ProductCatalogService = require('./productCatalog.service');

const CONTENT_REVIEW_GROUP = 'content_review';

function toNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function safeJsonParse(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function flattenSettingsGroups(groupedSettings = {}) {
  return Object.values(groupedSettings).reduce((acc, groupValue) => {
    if (groupValue && typeof groupValue === 'object' && !Array.isArray(groupValue)) {
      Object.assign(acc, groupValue);
    }
    return acc;
  }, {});
}

function inferSettingGroup(key) {
  if (['siteName', 'siteDesc', 'logoUrl', 'allowRegistration', 'maintenanceMode'].includes(key)) {
    return 'general';
  }
  if (['seoTitleTemplate', 'seoKeywords', 'seoDescription', 'gaId', 'baiduTongjiId'].includes(key)) {
    return 'seo';
  }
  if (['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpFrom', 'smtpSecure'].includes(key)) {
    return 'email';
  }
  if ([
    'storageType',
    'maxUploadMB',
    'allowedFileTypes',
    'storageBucket',
    'storageRegion',
    'storageAccessKey',
    'storageSecretKey',
  ].includes(key)) {
    return 'storage';
  }
  return 'general';
}

function getRangeStart(period = '7d') {
  const dayMap = { '7d': 7, '30d': 30, '90d': 90 };
  const days = dayMap[period] || 7;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return { start, days };
}

function listDays(start, days) {
  return Array.from({ length: days }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return current.toISOString().slice(0, 10);
  });
}

function sumAmounts(items, field = 'amount') {
  return items.reduce((sum, item) => sum + toNumber(item[field], 0), 0);
}

function calculateChange(current, previous) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function parseMembership(settings) {
  const parsedSettings = safeJsonParse(settings, {}) || {};
  const membership = parsedSettings.membership || { type: 'free', isActive: false };
  const endDate = membership.endDate ? new Date(membership.endDate) : null;
  const isExpired = endDate ? endDate < new Date() : false;
  const type = membership.type || 'free';
  const isPaid = ['basic', 'pro', 'enterprise'].includes(type);

  let status = 'inactive';
  if (membership.isActive && !isExpired) status = 'active';
  else if (membership.isActive && isExpired) status = 'expired';
  else if (membership.cancelledAt) status = 'cancelled';

  return {
    ...membership,
    type,
    isPaid,
    status,
    endDate: membership.endDate || null,
    autoRenew: !!membership.autoRenew,
  };
}

function buildContentReviewKey(type, id) {
  return `${type}:${id}`;
}

function mapDocumentReviewStatus(status) {
  if (status === 'published') return 'approved';
  if (status === 'draft') return 'pending';
  return 'rejected';
}

function mapTemplateReviewStatus(status) {
  if (status === 'active') return 'approved';
  if (status === 'inactive') return 'pending';
  return 'rejected';
}

function mapCommentReviewStatus(status) {
  if (status === 'active') return 'approved';
  return 'rejected';
}

async function getReviewMetaMap(keys = []) {
  if (!keys.length) return {};
  const rows = await db('system_settings')
    .where({ group: CONTENT_REVIEW_GROUP })
    .whereIn('key', keys)
    .select('key', 'value');

  return rows.reduce((acc, row) => {
    acc[row.key] = safeJsonParse(row.value, {}) || {};
    return acc;
  }, {});
}

async function saveReviewMeta(key, payload) {
  await db('system_settings')
    .insert({
      key,
      value: JSON.stringify(payload),
      group: CONTENT_REVIEW_GROUP,
      description: '内容审核元数据',
    })
    .onConflict('key')
    .merge({
      value: JSON.stringify(payload),
      group: CONTENT_REVIEW_GROUP,
      description: '内容审核元数据',
      updated_at: new Date(),
    });
}

async function collectContentReviewItems() {
  const [documents, templates, comments] = await Promise.all([
    db('documents as d')
      .leftJoin('users as u', 'd.author_id', 'u.id')
      .whereNot('d.status', 'deleted')
      .select(
        'd.id',
        'd.title',
        'd.content',
        'd.cover_image',
        'd.status',
        'd.created_at',
        'u.id as author_id',
        'u.username',
        'u.nickname'
      ),
    db('templates as t')
      .leftJoin('users as u', 't.author_id', 'u.id')
      .whereNot('t.status', 'deleted')
      .select(
        't.id',
        't.name',
        't.content',
        't.preview_image',
        't.status',
        't.created_at',
        'u.id as author_id',
        'u.username',
        'u.nickname'
      ),
    db('comments as c')
      .leftJoin('users as u', 'c.user_id', 'u.id')
      .leftJoin('documents as d', 'c.document_id', 'd.id')
      .whereNot('c.status', 'deleted')
      .select(
        'c.id',
        'c.content',
        'c.status',
        'c.created_at',
        'c.document_id',
        'u.id as author_id',
        'u.username',
        'u.nickname',
        'd.title as document_title'
      ),
  ]);

  const items = [
    ...documents.map((item) => ({
      id: buildContentReviewKey('document', item.id),
      rawId: item.id,
      title: item.title || '无标题文档',
      content: item.content || '',
      type: 'article',
      sourceType: 'document',
      status: mapDocumentReviewStatus(item.status),
      sourceStatus: item.status,
      authorName: item.nickname || item.username || '未知',
      previewImage: item.cover_image || '',
      createdAt: item.created_at,
    })),
    ...templates.map((item) => ({
      id: buildContentReviewKey('template', item.id),
      rawId: item.id,
      title: item.name || '未命名模板',
      content: item.content || '',
      type: 'template',
      sourceType: 'template',
      status: mapTemplateReviewStatus(item.status),
      sourceStatus: item.status,
      authorName: item.nickname || item.username || '未知',
      previewImage: item.preview_image || '',
      createdAt: item.created_at,
    })),
    ...comments.map((item) => ({
      id: buildContentReviewKey('comment', item.id),
      rawId: item.id,
      title: item.document_title ? `评论：${item.document_title}` : '评论内容',
      content: item.content || '',
      type: 'comment',
      sourceType: 'comment',
      status: mapCommentReviewStatus(item.status),
      sourceStatus: item.status,
      authorName: item.nickname || item.username || '未知',
      previewImage: '',
      createdAt: item.created_at,
    })),
  ];

  const reviewMetaMap = await getReviewMetaMap(items.map((item) => item.id));
  const reviewerIds = [...new Set(items.map((item) => reviewMetaMap[item.id]?.reviewerId).filter(Boolean))];
  let reviewerMap = {};

  if (reviewerIds.length > 0) {
    const reviewers = await db('users').whereIn('id', reviewerIds).select('id', 'username', 'nickname');
    reviewerMap = reviewers.reduce((acc, reviewer) => {
      acc[reviewer.id] = reviewer.nickname || reviewer.username || `用户#${reviewer.id}`;
      return acc;
    }, {});
  }

  return items.map((item) => {
    const meta = reviewMetaMap[item.id] || {};
    return {
      ...item,
      reviewerName: meta.reviewerId ? reviewerMap[meta.reviewerId] || `用户#${meta.reviewerId}` : '',
      reviewReason: meta.reason || '',
      reviewedAt: meta.reviewedAt || '',
    };
  });
}

function parseReviewTarget(targetId) {
  const [sourceType, ...rest] = String(targetId || '').split(':');
  const rawId = rest.join(':');

  if (!sourceType || !rawId) {
    throw Object.assign(new Error('无效的审核目标'), { statusCode: 400 });
  }

  if (!['document', 'template', 'comment'].includes(sourceType)) {
    throw Object.assign(new Error('不支持的审核类型'), { statusCode: 400 });
  }

  return { sourceType, rawId };
}

async function updateReviewTarget(targetId, action, reviewerId, reason = '') {
  const { sourceType, rawId } = parseReviewTarget(targetId);

  const updateMap = {
    document: action === 'approve'
      ? { table: 'documents', status: 'published' }
      : { table: 'documents', status: 'archived' },
    template: action === 'approve'
      ? { table: 'templates', status: 'active' }
      : { table: 'templates', status: 'inactive' },
    comment: action === 'approve'
      ? { table: 'comments', status: 'active' }
      : { table: 'comments', status: 'hidden' },
  };

  const { table, status } = updateMap[sourceType];

  const existing = await db(table).where({ id: rawId }).first();
  if (!existing) {
    throw Object.assign(new Error('审核目标不存在'), { statusCode: 404 });
  }

  await db(table).where({ id: rawId }).update({
    status,
    updated_at: new Date(),
  });

  await saveReviewMeta(buildContentReviewKey(sourceType, rawId), {
    status: action === 'approve' ? 'approved' : 'rejected',
    reason: reason || '',
    reviewerId,
    reviewedAt: new Date().toISOString(),
  });
}

const AdminService = {
  flattenSettingsGroups,

  async getDashboard() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      [totalUsers],
      [activeUsers],
      [bannedUsers],
      [todayUsers],
      [totalDocs],
      [publishedDocs],
      [todayDocs],
      recentUsers,
      membershipUsers,
      [todayOrders],
      [monthRevenue],
    ] = await Promise.all([
      db('users').count('* as count'),
      db('users').where({ status: 'active' }).count('* as count'),
      db('users').where({ status: 'banned' }).count('* as count'),
      db('users').where('created_at', '>=', startOfToday).count('* as count'),
      db('documents').whereNot('status', 'deleted').count('* as count'),
      db('documents').where({ status: 'published' }).count('* as count'),
      db('documents').where('created_at', '>=', startOfToday).whereNot('status', 'deleted').count('* as count'),
      db('users')
        .orderBy('created_at', 'desc')
        .limit(5)
        .select('id', 'username', 'nickname', 'email', 'created_at'),
      db('users').whereNotNull('settings').select('settings'),
      db.raw("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue FROM orders WHERE payment_status = 'paid' AND DATE(paid_at) = CURDATE()"),
      db.raw("SELECT COALESCE(SUM(amount), 0) as revenue FROM orders WHERE payment_status = 'paid' AND MONTH(paid_at) = MONTH(CURDATE()) AND YEAR(paid_at) = YEAR(CURDATE())"),
    ]);

    const membershipStats = membershipUsers.reduce((acc, user) => {
      const membership = parseMembership(user.settings);
      if (membership.status !== 'active') return acc;

      acc.total += 1;
      if (acc[membership.type] !== undefined) {
        acc[membership.type] += 1;
      }

      return acc;
    }, { total: 0, basic: 0, pro: 0, enterprise: 0 });

    return {
      users: { total: totalUsers.count, active: activeUsers.count },
      documents: { total: totalDocs.count, published: publishedDocs.count },
      revenue: { today: parseFloat(todayOrders.revenue || 0), thisMonth: parseFloat(monthRevenue.revenue || 0), todayOrders: todayOrders.count },
      userStats: {
        total: toNumber(totalUsers.count),
        active: toNumber(activeUsers.count),
        banned: toNumber(bannedUsers.count),
        today: toNumber(todayUsers.count),
      },
      documentStats: {
        total: toNumber(totalDocs.count),
        published: toNumber(publishedDocs.count),
        today: toNumber(todayDocs.count),
      },
      membershipStats,
      recentUsers: recentUsers.map((user) => ({
        ...user,
        createdAt: user.created_at,
      })),
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
    const query = db('orders as o').leftJoin('users as u', 'o.user_id', 'u.id');
    query.select('o.*', 'u.username', 'u.email');
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
        .insert({ key, value: JSON.stringify(value), group: inferSettingGroup(key) })
        .onConflict('key')
        .merge({ value: JSON.stringify(value), updated_at: new Date(), group: inferSettingGroup(key) });
    }
  },

  async sendTestEmail(to) {
    const settings = flattenSettingsGroups(await this.getSettings());

    if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPass || !settings.smtpFrom) {
      throw Object.assign(new Error('请先完善 SMTP 配置后再发送测试邮件'), { statusCode: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: Number(settings.smtpPort),
      secure: settings.smtpSecure === 'ssl',
      requireTLS: settings.smtpSecure === 'tls',
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    });

    await transporter.verify();
    await transporter.sendMail({
      from: settings.smtpFrom,
      to,
      subject: 'WxEditor SMTP 测试邮件',
      text: '这是一封来自 WxEditor 管理后台的测试邮件，说明当前 SMTP 配置可用。',
      html: '<p>这是一封来自 <strong>WxEditor</strong> 管理后台的测试邮件，说明当前 SMTP 配置可用。</p>',
    });
  },

  async getMembershipOverview({ page = 1, limit = 20, plan = '', status = '', search = '' } = {}) {
    const users = await db('users')
      .select('id', 'username', 'email', 'nickname', 'settings')
      .whereNotNull('settings')
      .orderBy('updated_at', 'desc');

    const members = users
      .map((user) => {
        const membership = parseMembership(user.settings);
        return {
          id: user.id,
          name: user.nickname || user.username || `用户#${user.id}`,
          email: user.email,
          plan: membership.type,
          period: membership.period || 'yearly',
          expiresAt: membership.endDate ? membership.endDate.slice(0, 10) : '',
          status: membership.status,
          autoRenew: membership.autoRenew,
        };
      })
      .filter((member) => member.plan !== 'free');

    const filteredMembers = members.filter((member) => {
      if (plan && member.plan !== plan) return false;
      if (status && member.status !== status) return false;
      if (search) {
        const keyword = String(search).toLowerCase();
        return member.name.toLowerCase().includes(keyword) || member.email.toLowerCase().includes(keyword);
      }
      return true;
    });

    const [monthRevenueRow] = await db.raw("SELECT COALESCE(SUM(amount), 0) as revenue FROM orders WHERE payment_status = 'paid' AND MONTH(paid_at) = MONTH(CURDATE()) AND YEAR(paid_at) = YEAR(CURDATE())");
    const [cancelledOrdersRow] = await db.raw("SELECT COUNT(*) as count FROM orders WHERE payment_status = 'refunded'");

    const paidMembers = members.filter((item) => ['basic', 'pro', 'enterprise'].includes(item.plan)).length;
    const activeSubscriptions = members.filter((item) => item.status === 'active').length;
    const churnRateBase = paidMembers || 1;
    const churnRate = Number(((toNumber(cancelledOrdersRow.count) / churnRateBase) * 100).toFixed(1));

    const start = Math.max(page - 1, 0) * limit;

    return {
      paidMembers,
      activeSubscriptions,
      monthlyRevenue: toNumber(monthRevenueRow.revenue, 0),
      churnRate,
      list: filteredMembers.slice(start, start + limit),
      total: filteredMembers.length,
      page,
      limit,
    };
  },

  async extendMembership(userId, { days = 30, plan, autoRenew } = {}) {
    const parsedDays = Number(days);
    if (!Number.isFinite(parsedDays) || parsedDays < 1 || parsedDays > 3650) {
      throw Object.assign(new Error('延期天数必须在 1 到 3650 之间'), { statusCode: 400 });
    }

    const user = await UserRepo.findById(userId);
    if (!user) {
      throw Object.assign(new Error('用户不存在'), { statusCode: 404 });
    }

    const settings = safeJsonParse(user.settings, {}) || {};
    const existingMembership = settings.membership || {};
    const nextPlan = String(plan || existingMembership.type || 'basic').trim();

    if (!['basic', 'pro', 'enterprise'].includes(nextPlan)) {
      throw Object.assign(new Error('无效的会员套餐'), { statusCode: 400 });
    }

    const now = new Date();
    const currentEndDate = existingMembership.endDate ? new Date(existingMembership.endDate) : null;
    const baseDate = currentEndDate && currentEndDate > now ? currentEndDate : now;
    const nextEndDate = new Date(baseDate);
    nextEndDate.setDate(nextEndDate.getDate() + parsedDays);

    settings.membership = {
      ...existingMembership,
      type: nextPlan,
      isActive: true,
      startDate: existingMembership.startDate || now.toISOString(),
      endDate: nextEndDate.toISOString(),
      autoRenew: autoRenew !== undefined ? !!autoRenew : !!existingMembership.autoRenew,
      cancelledAt: null,
      cancelReason: '',
    };

    await UserRepo.update(userId, { settings: JSON.stringify(settings) });

    const membership = parseMembership(settings);
    return {
      id: user.id,
      plan: membership.type,
      status: membership.status,
      expiresAt: membership.endDate ? membership.endDate.slice(0, 10) : '',
      autoRenew: membership.autoRenew,
    };
  },

  async cancelMembership(userId, { immediate = true, reason = '' } = {}) {
    const user = await UserRepo.findById(userId);
    if (!user) {
      throw Object.assign(new Error('用户不存在'), { statusCode: 404 });
    }

    const settings = safeJsonParse(user.settings, {}) || {};
    const existingMembership = settings.membership || {};

    if (!existingMembership.type || existingMembership.type === 'free') {
      throw Object.assign(new Error('该用户当前没有有效会员'), { statusCode: 400 });
    }

    const now = new Date().toISOString();
    settings.membership = {
      ...existingMembership,
      isActive: immediate ? false : !!existingMembership.isActive,
      autoRenew: false,
      cancelledAt: now,
      cancelReason: String(reason || '').trim(),
      endDate: immediate ? now : existingMembership.endDate,
    };

    await UserRepo.update(userId, { settings: JSON.stringify(settings) });

    const membership = parseMembership(settings);
    return {
      id: user.id,
      plan: membership.type,
      status: membership.status,
      expiresAt: membership.endDate ? membership.endDate.slice(0, 10) : '',
      autoRenew: membership.autoRenew,
    };
  },

  async listProducts({ page = 1, limit = 20 } = {}) {
    return ProductCatalogService.list({ page, limit });
  },

  async createProduct(data) {
    return ProductCatalogService.create(data);
  },

  async updateProduct(id, data) {
    return ProductCatalogService.update(id, data);
  },

  async deleteProduct(id) {
    return ProductCatalogService.remove(id);
  },

  async getContentReviewCounts() {
    const items = await collectContentReviewItems();

    return items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, { pending: 0, approved: 0, rejected: 0 });
  },

  async listContentReviews({ page = 1, limit = 20, status = '', type = '', search = '' } = {}) {
    const items = await collectContentReviewItems();
    const filteredItems = items
      .filter((item) => {
        if (status && item.status !== status) return false;
        if (type && item.type !== type) return false;
        if (search) {
          const keyword = String(search).toLowerCase();
          return [
            item.title,
            item.content,
            item.authorName,
            item.reviewerName,
          ].some((value) => String(value || '').toLowerCase().includes(keyword));
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const start = Math.max(page - 1, 0) * limit;
    return {
      list: filteredItems.slice(start, start + limit),
      total: filteredItems.length,
      page,
      limit,
    };
  },

  async approveContent(targetId, reviewerId) {
    await updateReviewTarget(targetId, 'approve', reviewerId);
  },

  async rejectContent(targetId, reviewerId, reason) {
    await updateReviewTarget(targetId, 'reject', reviewerId, reason);
  },

  async batchApprove(ids = [], reviewerId) {
    for (const id of ids) {
      await updateReviewTarget(id, 'approve', reviewerId);
    }
  },

  async batchReject(ids = [], reviewerId, reason) {
    for (const id of ids) {
      await updateReviewTarget(id, 'reject', reviewerId, reason);
    }
  },

  async getAnalytics(period = '7d') {
    const { start, days } = getRangeStart(period);
    const startDate = start.toISOString().slice(0, 19).replace('T', ' ');
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - days);
    const previousStartDate = previousStart.toISOString().slice(0, 19).replace('T', ' ');
    const labels = listDays(start, days);

    const [users, documents, aiChats, paidOrders, templates, [previousUsers], [previousDocuments], [previousAiChats], [previousRevenue]] = await Promise.all([
      db('users').where('created_at', '>=', startDate).select('created_at'),
      db('documents').where('created_at', '>=', startDate).whereNot('status', 'deleted').select('created_at'),
      db('ai_chats').where('created_at', '>=', startDate).select('created_at'),
      db('orders')
        .where('payment_status', 'paid')
        .whereNotNull('paid_at')
        .where('paid_at', '>=', startDate)
        .select('paid_at', 'amount', 'membership_type', 'id'),
      db('templates')
        .whereNot('status', 'deleted')
        .select('name', 'category', 'use_count')
        .orderBy('use_count', 'desc')
        .limit(8),
      db('users')
        .where('created_at', '>=', previousStartDate)
        .where('created_at', '<', startDate)
        .count('* as count'),
      db('documents')
        .where('created_at', '>=', previousStartDate)
        .where('created_at', '<', startDate)
        .whereNot('status', 'deleted')
        .count('* as count'),
      db('ai_chats')
        .where('created_at', '>=', previousStartDate)
        .where('created_at', '<', startDate)
        .count('* as count'),
      db('orders')
        .where('payment_status', 'paid')
        .whereNotNull('paid_at')
        .where('paid_at', '>=', previousStartDate)
        .where('paid_at', '<', startDate)
        .sum('amount as revenue'),
    ]);

    const userCountByDate = labels.reduce((acc, label) => {
      acc[label] = 0;
      return acc;
    }, {});
    users.forEach((item) => {
      const label = new Date(item.created_at).toISOString().slice(0, 10);
      if (userCountByDate[label] !== undefined) userCountByDate[label] += 1;
    });

    const contentCountByDate = labels.reduce((acc, label) => {
      acc[label] = 0;
      return acc;
    }, {});
    documents.forEach((item) => {
      const label = new Date(item.created_at).toISOString().slice(0, 10);
      if (contentCountByDate[label] !== undefined) contentCountByDate[label] += 1;
    });
    const maxContentCount = Math.max(...Object.values(contentCountByDate), 1);

    const revenueByDate = labels.reduce((acc, label) => {
      acc[label] = { date: label, orders: 0, amount: 0 };
      return acc;
    }, {});
    const revenueByType = {};

    paidOrders.forEach((order) => {
      const label = new Date(order.paid_at).toISOString().slice(0, 10);
      if (revenueByDate[label]) {
        revenueByDate[label].orders += 1;
        revenueByDate[label].amount += toNumber(order.amount, 0);
      }
      revenueByType[order.membership_type] = (revenueByType[order.membership_type] || 0) + toNumber(order.amount, 0);
    });

    const revenueList = Object.values(revenueByDate)
      .slice(-10)
      .map((item, index, list) => {
        const previous = list[index - 1];
        const previousAmount = previous ? previous.amount : 0;
        const change = previousAmount > 0
          ? Number((((item.amount - previousAmount) / previousAmount) * 100).toFixed(1))
          : (item.amount > 0 ? 100 : 0);

        return {
          date: item.date,
          orders: item.orders,
          amount: Number(item.amount.toFixed(2)),
          change,
        };
      });

    const revenueBreakdownEntries = Object.entries(revenueByType)
      .sort((a, b) => b[1] - a[1]);
    const totalRevenue = sumAmounts(paidOrders);
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    const revenueSummary = {
      total: Number(totalRevenue.toFixed(2)),
      breakdown: revenueBreakdownEntries.map(([name, amount], index) => ({
        name,
        amount: Number(amount.toFixed(2)),
        percent: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0,
        color: colors[index % colors.length],
      })),
    };

    return {
      newUsers: users.length,
      docCreated: documents.length,
      aiCalls: aiChats.length,
      revenue: Number(totalRevenue.toFixed(2)),
      changes: {
        newUsers: calculateChange(users.length, toNumber(previousUsers.count, 0)),
        docCreated: calculateChange(documents.length, toNumber(previousDocuments.count, 0)),
        aiCalls: calculateChange(aiChats.length, toNumber(previousAiChats.count, 0)),
        revenue: calculateChange(totalRevenue, toNumber(previousRevenue.revenue, 0)),
      },
      userChart: labels.map((label) => ({ date: label, count: userCountByDate[label] })),
      contentChart: labels.map((label) => ({
        date: label,
        count: contentCountByDate[label],
        percent: Math.round((contentCountByDate[label] / maxContentCount) * 100),
      })),
      revenueSummary,
      revenueList,
      topTemplates: templates.map((item, index) => ({
        name: item.name,
        category: item.category || '未分类',
        useCount: toNumber(item.use_count, 0),
        barPercent: templates.length > 0 && templates[0].use_count
          ? Math.round((toNumber(item.use_count, 0) / toNumber(templates[0].use_count, 1)) * 100)
          : (index === 0 ? 100 : 0),
      })),
    };
  },
};

module.exports = AdminService;
