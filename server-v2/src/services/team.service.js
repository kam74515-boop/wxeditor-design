const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const TeamService = {
  async listTeams(userId) {
    const teams = await db('teams as t')
      .leftJoin('team_members as tm', 't.id', 'tm.team_id')
      .where('t.owner_id', userId)
      .orWhere('tm.user_id', userId)
      .select('t.*', db.raw("CASE WHEN t.owner_id = ? THEN 'owner' ELSE tm.role END as role", [userId]))
      .groupBy('t.id');

    return Promise.all(teams.map(async team => {
      const members = await db('team_members as tm')
        .leftJoin('users as u', 'tm.user_id', 'u.id')
        .where('tm.team_id', team.id)
        .select('tm.user_id', 'tm.role', 'tm.joined_at', 'u.username', 'u.nickname', 'u.avatar');
      return { ...team, members };
    }));
  },

  async createTeam({ name }, userId) {
    const id = uuidv4();
    await db('teams').insert({ id, name, owner_id: userId });
    await db('team_members').insert({ team_id: id, user_id: userId, role: 'owner' });
    return this.getTeam(id, userId);
  },

  async getTeam(id, userId) {
    const team = await db('teams').where({ id }).first();
    if (!team) throw Object.assign(new Error('团队未找到'), { statusCode: 404 });

    const member = await db('team_members').where({ team_id: id, user_id: userId }).first();
    if (team.owner_id !== userId && !member) {
      throw Object.assign(new Error('无访问权限'), { statusCode: 403 });
    }

    const members = await db('team_members as tm')
      .leftJoin('users as u', 'tm.user_id', 'u.id')
      .where('tm.team_id', id)
      .select('tm.user_id', 'tm.role', 'tm.joined_at', 'u.username', 'u.nickname', 'u.avatar');

    const invitations = await db('team_invitations').where({ team_id: id, status: 'pending' });

    return { ...team, members, invitations };
  },

  async updateTeam(id, { name }, userId) {
    const team = await db('teams').where({ id }).first();
    if (!team) throw Object.assign(new Error('团队未找到'), { statusCode: 404 });
    if (team.owner_id !== userId) throw Object.assign(new Error('仅拥有者可更新'), { statusCode: 403 });
    await db('teams').where({ id }).update({ name, updated_at: new Date() });
    return db('teams').where({ id }).first();
  },

  async deleteTeam(id, userId) {
    const team = await db('teams').where({ id }).first();
    if (!team) throw Object.assign(new Error('团队未找到'), { statusCode: 404 });
    if (team.owner_id !== userId) throw Object.assign(new Error('仅拥有者可删除'), { statusCode: 403 });
    await db('team_members').where({ team_id: id }).delete();
    await db('team_invitations').where({ team_id: id }).delete();
    await db('teams').where({ id }).delete();
  },

  async inviteMember(teamId, { email, role }, userId) {
    const team = await db('teams').where({ id: teamId }).first();
    if (!team) throw Object.assign(new Error('团队未找到'), { statusCode: 404 });

    const isAdmin = team.owner_id === userId || await db('team_members').where({ team_id: teamId, user_id: userId, role: 'admin' }).first();
    if (!isAdmin) throw Object.assign(new Error('仅拥有者或管理员可邀请成员'), { statusCode: 403 });

    const code = `INV_${teamId}_${Date.now()}`;
    try {
      await db('team_invitations').insert({ id: code, team_id: teamId, inviter_id: userId, email, role: role || 'member', status: 'pending' });
    } catch {
      throw Object.assign(new Error('该用户已被邀请'), { statusCode: 409 });
    }
    return { code, email };
  },

  async acceptInvitation(code, userId, userEmail) {
    const invitation = await db('team_invitations').where({ id: code, status: 'pending' }).first();
    if (!invitation) throw Object.assign(new Error('邀请不存在'), { statusCode: 404 });

    if (invitation.email !== userEmail) {
      throw Object.assign(new Error('邀请邮箱不匹配'), { statusCode: 403 });
    }

    const existing = await db('team_members').where({ team_id: invitation.team_id, user_id: userId }).first();
    if (!existing) {
      await db('team_members').insert({ team_id: invitation.team_id, user_id: userId, role: invitation.role || 'member' });
    }

    await db('team_invitations').where({ id: code }).update({ status: 'accepted' });
    return db('teams').where({ id: invitation.team_id }).first();
  },

  async rejectInvitation(code) {
    await db('team_invitations').where({ id: code }).update({ status: 'rejected' });
  },

  async listInvitations(email) {
    return db('team_invitations as ti')
      .join('teams as t', 'ti.team_id', 't.id')
      .where('ti.email', email)
      .select('ti.id as code', 'ti.team_id as teamId', 't.name as teamName', 'ti.inviter_id as invitedBy', 'ti.email', 'ti.status');
  },

  async updateMemberRole(teamId, memberId, { role }, userId) {
    const team = await db('teams').where({ id: teamId }).first();
    if (!team) throw Object.assign(new Error('团队未找到'), { statusCode: 404 });

    const isAdmin = team.owner_id === userId || await db('team_members').where({ team_id: teamId, user_id: userId, role: 'admin' }).first();
    if (!isAdmin) throw Object.assign(new Error('需要拥有者/管理员权限'), { statusCode: 403 });

    await db('team_members').where({ team_id: teamId, user_id: memberId }).update({ role });
  },

  async removeMember(teamId, memberId, userId) {
    const team = await db('teams').where({ id: teamId }).first();
    if (!team) throw Object.assign(new Error('团队未找到'), { statusCode: 404 });

    const isAdmin = team.owner_id === userId || await db('team_members').where({ team_id: teamId, user_id: userId, role: 'admin' }).first();
    if (!isAdmin) throw Object.assign(new Error('需要拥有者/管理员权限'), { statusCode: 403 });
    if (team.owner_id === parseInt(memberId)) throw Object.assign(new Error('不可移除团队拥有者'), { statusCode: 400 });

    const result = await db('team_members').where({ team_id: teamId, user_id: memberId }).delete();
    if (result === 0) throw Object.assign(new Error('成员未找到'), { statusCode: 404 });
  },
};

module.exports = TeamService;
