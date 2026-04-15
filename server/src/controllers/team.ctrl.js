const express = require('express');
const { auth } = require('../middleware/auth');
const TeamService = require('../services/team.service');

const router = express.Router();

router.use(auth);

router.get('/teams', async (req, res) => {
  try {
    const teams = await TeamService.listTeams(req.userId);
    res.json({ success: true, data: teams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/teams', async (req, res) => {
  try {
    const team = await TeamService.createTeam(req.body, req.userId);
    res.json({ success: true, data: team, message: '团队创建成功' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/teams/:id', async (req, res) => {
  try {
    const team = await TeamService.getTeam(req.params.id, req.userId);
    res.json({ success: true, data: team });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.put('/teams/:id', async (req, res) => {
  try {
    const team = await TeamService.updateTeam(req.params.id, req.body, req.userId);
    res.json({ success: true, data: team, message: '更新成功' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.delete('/teams/:id', async (req, res) => {
  try {
    await TeamService.deleteTeam(req.params.id, req.userId);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/teams/:id/invite', async (req, res) => {
  try {
    const result = await TeamService.inviteMember(req.params.id, req.body, req.userId);
    res.json({ success: true, data: result, message: '邀请发送成功' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/invitations/:code/accept', async (req, res) => {
  try {
    const team = await TeamService.acceptInvitation(req.params.code, req.userId, req.body.userEmail || req.user?.email);
    res.json({ success: true, data: team, message: '已加入团队' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/invitations/:code/reject', async (req, res) => {
  try {
    await TeamService.rejectInvitation(req.params.code);
    res.json({ success: true, message: '邀请已拒绝' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/invitations', async (req, res) => {
  try {
    const results = await TeamService.listInvitations(req.user?.email || '');
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/teams/:id/members/:memberId', async (req, res) => {
  try {
    await TeamService.updateMemberRole(req.params.id, req.params.memberId, req.body, req.userId);
    res.json({ success: true, message: '成员角色更新成功' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.delete('/teams/:id/members/:memberId', async (req, res) => {
  try {
    await TeamService.removeMember(req.params.id, req.params.memberId, req.userId);
    res.json({ success: true, message: '成员移除成功' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

module.exports = router;
