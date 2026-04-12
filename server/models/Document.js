const mongoose = require('mongoose');

/**
 * 文档/内容模型
 * 支持会员权限控制
 */
const documentSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: [true, '标题不能为空'],
    trim: true,
    maxlength: [200, '标题最多200字符']
  },
  content: {
    type: String,
    default: ''
  },
  summary: {
    type: String,
    maxlength: 500
  },
  
  // 作者信息
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorInfo: {
    username: String,
    nickname: String,
    avatar: String
  },
  
  // 协作者
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 内容权限
  visibility: {
    type: String,
    enum: ['public', 'private', 'members_only', 'vip_only'],
    default: 'private'
  },
  
  // 访问密码（可选）
  accessPassword: {
    type: String,
    select: false
  },
  
  // 分类和标签
  category: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // 状态
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'deleted'],
    default: 'draft'
  },
  
  // 封面
  coverImage: {
    type: String,
    default: ''
  },
  
  // 附件
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 版本控制
  version: {
    type: Number,
    default: 1
  },
  versionHistory: [{
    version: Number,
    content: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changeSummary: String
  }],
  
  // 统计信息
  stats: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    readingTime: { type: Number, default: 0 } // 分钟
  },
  
  // SEO
  seo: {
    title: String,
    description: String,
    keywords: [String],
    slug: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  
  // 发布信息
  publishedAt: Date,
  scheduledAt: Date, // 定时发布
  
  // 微信公众号同步信息
  wechat: {
    mediaId: String, // 微信素材ID
    url: String, // 微信文章链接
    syncedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'synced', 'failed'],
      default: 'pending'
    },
    errorMessage: String
  },
  
  // 是否允许评论
  allowComments: {
    type: Boolean,
    default: true
  },
  
  // 是否置顶
  isPinned: {
    type: Boolean,
    default: false
  },
  pinnedAt: Date,
  
  // 是否推荐
  isRecommended: {
    type: Boolean,
    default: false
  },
  recommendedAt: Date,
  
  // 最后编辑
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastEditedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：是否公开
documentSchema.virtual('isPublic').get(function() {
  return this.visibility === 'public';
});

// 虚拟字段：是否会员专享
documentSchema.virtual('isMembersOnly').get(function() {
  return this.visibility === 'members_only';
});

// 虚拟字段：是否 VIP 专享
documentSchema.virtual('isVipOnly').get(function() {
  return this.visibility === 'vip_only';
});

// 虚拟字段：内容预览（对于受限内容）
documentSchema.virtual('preview').get(function() {
  if (this.visibility === 'public') return this.content;
  
  // 提取前200字符作为预览
  const plainText = this.content.replace(/<[^>]*>/g, '');
  return plainText.substring(0, 200) + '...';
});

// 索引
documentSchema.index({ author: 1, createdAt: -1 });
documentSchema.index({ status: 1, visibility: 1 });
documentSchema.index({ category: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ 'seo.slug': 1 });
documentSchema.index({ isPinned: -1, pinnedAt: -1 });
documentSchema.index({ isRecommended: -1, recommendedAt: -1 });
documentSchema.index({ title: 'text', content: 'text' }); // 全文搜索

// 中间件：更新字数统计
documentSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const plainText = this.content.replace(/<[^>]*>/g, '');
    this.stats.wordCount = plainText.length;
    this.stats.readingTime = Math.ceil(this.stats.wordCount / 300); // 按300字/分钟
    this.lastEditedAt = new Date();
  }
  next();
});

// 中间件：更新版本历史
documentSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    this.version += 1;
    this.versionHistory.push({
      version: this.version - 1,
      content: this.$locals.oldContent || this.content,
      changedBy: this.lastEditedBy,
      changedAt: new Date()
    });
    
    // 限制历史版本数量
    if (this.versionHistory.length > 50) {
      this.versionHistory = this.versionHistory.slice(-50);
    }
  }
  next();
});

// 实例方法：检查用户是否有权限查看
documentSchema.methods.canView = function(userId, userRole) {
  // 管理员可以查看所有
  if (userRole === 'admin' || userRole === 'superadmin') return true;
  
  // 作者本人
  if (this.author.toString() === userId) return true;
  
  // 协作者
  const collaborator = this.collaborators.find(c => 
    c.user.toString() === userId
  );
  if (collaborator) return true;
  
  // 公开内容
  if (this.visibility === 'public') return true;
  
  return false;
};

// 实例方法：检查用户是否有权限编辑
documentSchema.methods.canEdit = function(userId, userRole) {
  // 管理员可以编辑所有
  if (userRole === 'admin' || userRole === 'superadmin') return true;
  
  // 作者本人
  if (this.author.toString() === userId) return true;
  
  // 协作者中的编辑者或管理员
  const collaborator = this.collaborators.find(c => 
    c.user.toString() === userId && ['editor', 'admin'].includes(c.role)
  );
  if (collaborator) return true;
  
  return false;
};

// 实例方法：增加浏览量
documentSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  return this.save({ validateBeforeSave: false });
};

// 静态方法：获取公开文档
documentSchema.statics.getPublicDocuments = function(options = {}) {
  const { page = 1, limit = 10, sort = '-createdAt' } = options;
  
  return this.find({ 
    status: 'published',
    visibility: 'public'
  })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('author', 'username nickname avatar');
};

// 静态方法：获取会员专享文档
documentSchema.statics.getMembersDocuments = function(options = {}) {
  const { page = 1, limit = 10, sort = '-createdAt' } = options;
  
  return this.find({ 
    status: 'published',
    visibility: { $in: ['public', 'members_only', 'vip_only'] }
  })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('author', 'username nickname avatar');
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
