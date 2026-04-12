const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '文件夹名称不能为空'],
    trim: true,
    maxlength: [100, '文件夹名称最多100个字符']
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 索引：同一团队同一父文件夹下名称唯一
FolderSchema.index({ teamId: 1, parentId: 1, name: 1 }, { unique: true });

// 静态方法：获取子文件夹
FolderSchema.statics.findChildren = function(teamId, parentId = null) {
  return this.find({ teamId, parentId }).sort({ sortOrder: 1, name: 1 });
};

// 静态方法：获取根文件夹
FolderSchema.statics.findRootFolders = function(teamId) {
  return this.find({ teamId, parentId: null }).sort({ sortOrder: 1, name: 1 });
};

const Folder = mongoose.model('Folder', FolderSchema);

module.exports = Folder;
