const mongoose = require('mongoose');

const TeamMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'editor', 'viewer'],
    default: 'viewer'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const TeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '团队名称不能为空'],
    trim: true,
    maxlength: [50, '团队名称最多50个字符']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, '描述最多500个字符']
  },
  logo: {
    type: String,
    default: ''
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [TeamMemberSchema],
  settings: {
    defaultRole: {
      type: String,
      enum: ['viewer', 'editor'],
      default: 'editor'
    },
    inviteLink: {
      type: String,
      default: ''
    }
  },
  quota: {
    documents: {
      type: Number,
      default: 100
    },
    storage: {
      type: Number,
      default: 1024
    },
    members: {
      type: Number,
      default: 10
    }
  }
}, {
  timestamps: true
});

// 索引
TeamSchema.index({ slug: 1 }, { unique: true });
TeamSchema.index({ ownerId: 1 });
TeamSchema.index({ 'members.userId': 1 });

// 静态方法：按成员查找团队
TeamSchema.statics.findByMemberId = function(userId) {
  return this.find({
    $or: [
      { ownerId: userId },
      { 'members.userId': userId }
    ]
  });
};

// 实例方法：添加成员
TeamSchema.methods.addMember = function(userId, role = 'viewer') {
  const existingMember = this.members.find(m => m.userId.toString() === userId.toString());
  if (existingMember) {
    existingMember.role = role;
  } else {
    this.members.push({ userId, role, joinedAt: new Date() });
  }
  return this.save();
};

// 实例方法：检查用户权限
TeamSchema.methods.getUserRole = function(userId) {
  if (this.ownerId.toString() === userId.toString()) {
    return 'owner';
  }
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  return member?.role || null;
};

// 实例方法：检查是否为成员
TeamSchema.methods.hasMember = function(userId) {
  return this.ownerId.toString() === userId.toString() || 
    this.members.some(m => m.userId.toString() === userId.toString());
};

const Team = mongoose.model('Team', TeamSchema);

module.exports = Team;
