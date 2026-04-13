const TeamService = require('../../src/services/team.service');
const db = require('../../src/config/db');

// ── db mock with chainable builder ────────────────────
jest.mock('../../src/config/db', () => {
  const chain = {
    where: jest.fn(), first: jest.fn(), insert: jest.fn(), update: jest.fn(),
    delete: jest.fn(), leftJoin: jest.fn(), select: jest.fn(), join: jest.fn(),
    orWhere: jest.fn(), groupBy: jest.fn(), groupByRaw: jest.fn(),
  };
  Object.values(chain).forEach(m => m.mockReturnValue(chain));
  chain.first.mockResolvedValue(null);
  const fn = jest.fn(() => chain);
  fn.raw = jest.fn().mockReturnValue('RAW_EXPR');
  return fn;
});

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('mock-uuid') }));

describe('TeamService', () => {
  let chain;

  beforeEach(() => {
    jest.clearAllMocks();
    chain = db();
  });

  // ── listTeams ────────────────────────────────────
  describe('listTeams', () => {
    it('should return teams with members', async () => {
      const teams = [{ id: 't1', name: 'Team1', owner_id: 'u1', role: 'owner' }];
      chain.leftJoin.mockReturnValue(chain);
      chain.where.mockReturnValue(chain);
      chain.orWhere.mockReturnValue(chain);
      chain.select.mockReturnValue(chain);
      chain.groupBy.mockResolvedValue(teams);
      // For inner query (members per team)
      chain.leftJoin.mockReturnValue(chain);

      const result = await TeamService.listTeams('u1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array if no teams', async () => {
      chain.leftJoin.mockReturnValue(chain);
      chain.where.mockReturnValue(chain);
      chain.orWhere.mockReturnValue(chain);
      chain.select.mockReturnValue(chain);
      chain.groupBy.mockResolvedValue([]);
      const result = await TeamService.listTeams('u1');
      expect(result).toEqual([]);
    });
  });

  // ── createTeam ───────────────────────────────────
  describe('createTeam', () => {
    it('should create team and return via getTeam', async () => {
      chain.insert.mockResolvedValue();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 'mock-uuid', name: 'NewTeam', owner_id: 'u1' });
      chain.leftJoin.mockReturnValue(chain);
      chain.select.mockResolvedValue([]);
      // invitations query
      chain.where.mockReturnValue(chain);

      const result = await TeamService.createTeam({ name: 'NewTeam' }, 'u1');
      expect(chain.insert).toHaveBeenCalledTimes(2); // teams + team_members
      expect(result).toHaveProperty('id', 'mock-uuid');
    });
  });

  // ── getTeam ──────────────────────────────────────
  describe('getTeam', () => {
    it('should throw 404 if team not found', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue(null);
      await expect(TeamService.getTeam('t1', 'u1')).rejects.toMatchObject({
        message: '团队未找到', statusCode: 404,
      });
    });

    it('should throw 403 if user not member or owner', async () => {
      chain.where.mockReturnValue(chain);
      chain.first
        .mockResolvedValueOnce({ id: 't1', owner_id: 'other' })
        .mockResolvedValueOnce(null); // no membership
      await expect(TeamService.getTeam('t1', 'u1')).rejects.toMatchObject({
        message: '无访问权限', statusCode: 403,
      });
    });

    it('should return team with members and invitations for owner', async () => {
      const team = { id: 't1', owner_id: 'u1' };
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue(team);
      chain.leftJoin.mockReturnValue(chain);
      chain.select.mockResolvedValue([{ user_id: 'u1', role: 'owner' }]);

      const result = await TeamService.getTeam('t1', 'u1');
      expect(result).toHaveProperty('id', 't1');
      expect(result).toHaveProperty('members');
      expect(result).toHaveProperty('invitations');
    });

    it('should allow member access', async () => {
      const team = { id: 't1', owner_id: 'other' };
      chain.where.mockReturnValue(chain);
      chain.first
        .mockResolvedValueOnce(team)
        .mockResolvedValueOnce({ team_id: 't1', user_id: 'u1' }); // is member
      chain.leftJoin.mockReturnValue(chain);
      chain.select.mockResolvedValue([]);

      const result = await TeamService.getTeam('t1', 'u1');
      expect(result).toHaveProperty('id', 't1');
    });
  });

  // ── updateTeam ───────────────────────────────────
  describe('updateTeam', () => {
    it('should throw 404 if team not found', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue(null);
      await expect(TeamService.updateTeam('t1', { name: 'X' }, 'u1')).rejects.toMatchObject({
        message: '团队未找到', statusCode: 404,
      });
    });

    it('should throw 403 if not owner', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 't1', owner_id: 'other' });
      await expect(TeamService.updateTeam('t1', { name: 'X' }, 'u1')).rejects.toMatchObject({
        message: '仅拥有者可更新', statusCode: 403,
      });
    });

    it('should update team name', async () => {
      chain.where.mockReturnValue(chain);
      chain.first
        .mockResolvedValueOnce({ id: 't1', owner_id: 'u1' })
        .mockResolvedValueOnce({ id: 't1', name: 'Updated' });
      chain.update.mockResolvedValue(1);

      const result = await TeamService.updateTeam('t1', { name: 'Updated' }, 'u1');
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated' }));
      expect(result).toEqual({ id: 't1', name: 'Updated' });
    });
  });

  // ── deleteTeam ───────────────────────────────────
  describe('deleteTeam', () => {
    it('should throw 404 if team not found', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue(null);
      await expect(TeamService.deleteTeam('t1', 'u1')).rejects.toMatchObject({
        message: '团队未找到', statusCode: 404,
      });
    });

    it('should throw 403 if not owner', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 't1', owner_id: 'other' });
      await expect(TeamService.deleteTeam('t1', 'u1')).rejects.toMatchObject({
        message: '仅拥有者可删除', statusCode: 403,
      });
    });

    it('should delete members, invitations, and team', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 't1', owner_id: 'u1' });
      chain.delete.mockResolvedValue(1);

      await TeamService.deleteTeam('t1', 'u1');
      expect(chain.delete).toHaveBeenCalledTimes(3); // members, invitations, team
    });
  });

  // ── inviteMember ─────────────────────────────────
  describe('inviteMember', () => {
    it('should throw 404 if team not found', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue(null);
      await expect(TeamService.inviteMember('t1', { email: 'a@b.c', role: 'member' }, 'u1'))
        .rejects.toMatchObject({ message: '团队未找到', statusCode: 404 });
    });

    it('should throw 403 if not owner or admin', async () => {
      chain.where.mockReturnValue(chain);
      chain.first
        .mockResolvedValueOnce({ id: 't1', owner_id: 'other' })
        .mockResolvedValueOnce(null); // not admin member
      await expect(TeamService.inviteMember('t1', { email: 'a@b.c' }, 'u1'))
        .rejects.toMatchObject({ message: '仅拥有者或管理员可邀请成员', statusCode: 403 });
    });

    it('should create invitation for owner', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 't1', owner_id: 'u1' });
      chain.insert.mockResolvedValue();

      const result = await TeamService.inviteMember('t1', { email: 'a@b.c', role: 'admin' }, 'u1');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('email', 'a@b.c');
    });

    it('should create invitation for admin member', async () => {
      chain.where.mockReturnValue(chain);
      chain.first
        .mockResolvedValueOnce({ id: 't1', owner_id: 'other' })
        .mockResolvedValueOnce({ role: 'admin' });
      chain.insert.mockResolvedValue();

      const result = await TeamService.inviteMember('t1', { email: 'a@b.c' }, 'u1');
      expect(result).toHaveProperty('code');
    });

    it('should throw 409 on duplicate invite', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 't1', owner_id: 'u1' });
      chain.insert.mockRejectedValue(new Error('duplicate'));

      await expect(TeamService.inviteMember('t1', { email: 'a@b.c' }, 'u1'))
        .rejects.toMatchObject({ message: '该用户已被邀请', statusCode: 409 });
    });
  });

  // ── acceptInvitation ─────────────────────────────
  describe('acceptInvitation', () => {
    it('should throw 404 if invitation not found', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue(null);
      await expect(TeamService.acceptInvitation('code1', 'u1', 'a@b.c'))
        .rejects.toMatchObject({ message: '邀请不存在', statusCode: 404 });
    });

    it('should throw 403 if email mismatch', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 'c1', email: 'other@b.c', team_id: 't1', role: 'member' });
      await expect(TeamService.acceptInvitation('code1', 'u1', 'a@b.c'))
        .rejects.toMatchObject({ message: '邀请邮箱不匹配', statusCode: 403 });
    });

    it('should add member and accept invitation', async () => {
      chain.where.mockReturnValue(chain);
      chain.first
        .mockResolvedValueOnce({ id: 'c1', email: 'a@b.c', team_id: 't1', role: 'member' })
        .mockResolvedValueOnce(null) // not existing member
        .mockResolvedValueOnce({ id: 't1', name: 'Team1' }); // team
      chain.insert.mockResolvedValue();
      chain.update.mockResolvedValue(1);

      const result = await TeamService.acceptInvitation('code1', 'u1', 'a@b.c');
      expect(chain.insert).toHaveBeenCalled();
      expect(chain.update).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 't1');
    });

    it('should not re-add if already a member', async () => {
      chain.where.mockReturnValue(chain);
      chain.first
        .mockResolvedValueOnce({ id: 'c1', email: 'a@b.c', team_id: 't1', role: 'member' })
        .mockResolvedValueOnce({ team_id: 't1', user_id: 'u1' }) // existing member
        .mockResolvedValueOnce({ id: 't1', name: 'Team1' });
      chain.update.mockResolvedValue(1);

      const result = await TeamService.acceptInvitation('code1', 'u1', 'a@b.c');
      expect(chain.insert).not.toHaveBeenCalled(); // no re-insert
      expect(result).toHaveProperty('id', 't1');
    });
  });

  // ── rejectInvitation ─────────────────────────────
  describe('rejectInvitation', () => {
    it('should update invitation status to rejected', async () => {
      chain.where.mockReturnValue(chain);
      chain.update.mockResolvedValue(1);
      await TeamService.rejectInvitation('code1');
      expect(chain.update).toHaveBeenCalledWith({ status: 'rejected' });
    });
  });

  // ── listInvitations ──────────────────────────────
  describe('listInvitations', () => {
    it('should return invitations for email', async () => {
      chain.join.mockReturnValue(chain);
      chain.where.mockReturnValue(chain);
      chain.select.mockResolvedValue([{ code: 'c1', teamName: 'T1' }]);
      const result = await TeamService.listInvitations('a@b.c');
      expect(result).toEqual([{ code: 'c1', teamName: 'T1' }]);
    });
  });

  // ── updateMemberRole ─────────────────────────────
  describe('updateMemberRole', () => {
    it('should throw 404 if team not found', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue(null);
      await expect(TeamService.updateMemberRole('t1', 'm1', { role: 'admin' }, 'u1'))
        .rejects.toMatchObject({ message: '团队未找到', statusCode: 404 });
    });

    it('should throw 403 if not admin or owner', async () => {
      chain.where.mockReturnValue(chain);
      chain.first
        .mockResolvedValueOnce({ id: 't1', owner_id: 'other' })
        .mockResolvedValueOnce(null);
      await expect(TeamService.updateMemberRole('t1', 'm1', { role: 'admin' }, 'u1'))
        .rejects.toMatchObject({ message: '需要拥有者/管理员权限', statusCode: 403 });
    });

    it('should update role for owner', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 't1', owner_id: 'u1' });
      chain.update.mockResolvedValue(1);
      await TeamService.updateMemberRole('t1', 'm1', { role: 'admin' }, 'u1');
      expect(chain.update).toHaveBeenCalledWith({ role: 'admin' });
    });
  });

  // ── removeMember ─────────────────────────────────
  describe('removeMember', () => {
    it('should throw 404 if team not found', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue(null);
      await expect(TeamService.removeMember('t1', 'm1', 'u1'))
        .rejects.toMatchObject({ message: '团队未找到', statusCode: 404 });
    });

    it('should throw 403 if not admin or owner', async () => {
      chain.where.mockReturnValue(chain);
      chain.first
        .mockResolvedValueOnce({ id: 't1', owner_id: 'other' })
        .mockResolvedValueOnce(null);
      await expect(TeamService.removeMember('t1', 'm1', 'u1'))
        .rejects.toMatchObject({ message: '需要拥有者/管理员权限', statusCode: 403 });
    });

    it('should throw 400 if trying to remove owner', async () => {
      // Service does: parseInt(memberId) === owner_id (number)
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 't1', owner_id: 123 });
      await expect(TeamService.removeMember('t1', '123', 'u1'))
        .rejects.toMatchObject({ message: '不可移除团队拥有者', statusCode: 400 });
    });

    it('should throw 404 if member not found (delete returns 0)', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 't1', owner_id: 1 });
      chain.delete.mockResolvedValue(0);
      await expect(TeamService.removeMember('t1', '999', 'u1'))
        .rejects.toMatchObject({ message: '成员未找到', statusCode: 404 });
    });

    it('should remove member successfully', async () => {
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 't1', owner_id: 1 });
      chain.delete.mockResolvedValue(1);
      await TeamService.removeMember('t1', '456', 'u1');
      expect(chain.delete).toHaveBeenCalled();
    });
  });
});
