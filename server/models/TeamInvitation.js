const mongoose = require('mongoose');

const TeamInvitationSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: [true, '邮箱不能为空'],
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'editor', 'viewer'],
    default: 'editor'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending'
  },
  inviteCode: {
    type: String,
    unique: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后过期
  }
}, {
  timestamps: true
});

// 索引
TeamInvitationSchema.index({ teamId: 1, email: 1 }, { unique: true });
TeamInvitationSchema.index({ inviteCode: 1 }, { unique: true });
TeamInvitationSchema.index({ status: 1 });

// 生成邀请码
TeamInvitationSchema.pre('save', function(next) {
  if (!this.inviteCode) {
    this.inviteCode = 'inv_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
  }
  next();
});

// 静态方法：检查邀请是否有效
TeamInvitationSchema.statics.findValidByCode = function(code) {
  return this.findOne({
    inviteCode: code,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });
};

const TeamInvitation = mongoose.model('TeamInvitation', TeamInvitationSchema);

module.exports = TeamInvitation;
