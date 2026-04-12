const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

class CollaborationService {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.documents = new Map();
    this.users = new Map();

    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication required'));
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`用户连接: ${socket.id}`);
      
      // 用户加入文档
      socket.on('join-document', (data) => this.handleJoinDocument(socket, data));
      
      // 用户离开文档
      socket.on('leave-document', (data) => this.handleLeaveDocument(socket, data));
      
      // 文档内容更新
      socket.on('document-change', (data) => this.handleDocumentChange(socket, data));
      
      // 光标位置更新
      socket.on('cursor-move', (data) => this.handleCursorMove(socket, data));
      
      // 选择区域更新
      socket.on('selection-change', (data) => this.handleSelectionChange(socket, data));
      
      // 保存文档
      socket.on('save-document', (data) => this.handleSaveDocument(socket, data));
      
      // 用户断开连接
      socket.on('disconnect', () => this.handleDisconnect(socket));
      
      // 获取在线用户列表
      socket.on('get-users', (data) => this.handleGetUsers(socket, data));
      
      // 发送聊天消息
      socket.on('chat-message', (data) => this.handleChatMessage(socket, data));
      
      // 请求编辑权限
      socket.on('request-edit', (data) => this.handleRequestEdit(socket, data));
      
      // 释放编辑权限
      socket.on('release-edit', (data) => this.handleReleaseEdit(socket, data));
    });
  }

  /**
   * 处理用户加入文档
   */
  handleJoinDocument(socket, { documentId, userInfo }) {
    // 权限校验：验证用户是否有权访问该文档
    try {
      const db = require('../config/database');
      const doc = db.prepare('SELECT author_id FROM documents WHERE id = ?').get(documentId);
      if (!doc) {
        socket.emit('error', { message: '文档不存在' });
        return;
      }
      const isOwner = String(doc.author_id) === String(socket.userId);
      const isCollaborator = db.prepare(
        'SELECT 1 FROM collaborators WHERE document_id = ? AND user_id = ?'
      ).get(documentId, socket.userId);
      if (!isOwner && !isCollaborator) {
        socket.emit('error', { message: '无权访问该文档' });
        return;
      }
    } catch (err) {
      console.error('文档权限校验失败:', err.message);
      socket.emit('error', { message: '权限验证失败' });
      return;
    }

    const userId = userInfo.id || uuidv4();
    const user = {
      id: userId,
      socketId: socket.id,
      name: userInfo.name || '匿名用户',
      avatar: userInfo.avatar || '',
      color: this.getUserColor(),
      joinedAt: new Date(),
      isEditing: false
    };
    
    // 存储用户信息
    this.users.set(socket.id, { ...user, documentId });
    
    // 加入文档房间
    socket.join(documentId);
    
    // 初始化文档（如果不存在）
    if (!this.documents.has(documentId)) {
      this.documents.set(documentId, {
        id: documentId,
        content: '',
        title: '',
        lastModified: new Date(),
        version: 0,
        history: [],
        activeUsers: new Map(),
        editLock: null // 编辑锁，用于简单锁机制
      });
    }
    
    const doc = this.documents.get(documentId);
    doc.activeUsers.set(socket.id, user);
    
    // 通知当前用户文档状态
    socket.emit('document-joined', {
      success: true,
      userId: userId,
      document: {
        id: doc.id,
        content: doc.content,
        title: doc.title,
        version: doc.version,
        lastModified: doc.lastModified
      },
      users: Array.from(doc.activeUsers.values()).map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        color: u.color,
        isEditing: u.isEditing
      }))
    });
    
    // 通知其他用户有新用户加入
    socket.to(documentId).emit('user-joined', {
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        color: user.color
      },
      userCount: doc.activeUsers.size
    });
    
    console.log(`用户 ${user.name} 加入文档 ${documentId}`);
  }

  /**
   * 处理用户离开文档
   */
  handleLeaveDocument(socket, { documentId }) {
    const userInfo = this.users.get(socket.id);
    if (!userInfo) return;
    
    const doc = this.documents.get(documentId);
    if (doc) {
      // 释放编辑锁
      if (doc.editLock === socket.id) {
        doc.editLock = null;
      }
      
      doc.activeUsers.delete(socket.id);
      
      // 通知其他用户
      socket.to(documentId).emit('user-left', {
        userId: userInfo.id,
        userCount: doc.activeUsers.size
      });
    }
    
    // 离开房间
    socket.leave(documentId);
    this.users.delete(socket.id);
    
    console.log(`用户 ${userInfo.name} 离开文档 ${documentId}`);
  }

  /**
   * 处理文档内容变更
   * 支持两种模式：乐观锁（OT）和悲观锁（Lock）
   */
  handleDocumentChange(socket, { documentId, changes, version, mode = 'lock' }) {
    const userInfo = this.users.get(socket.id);
    if (!userInfo) return;
    
    const doc = this.documents.get(documentId);
    if (!doc) return;
    
    // 悲观锁模式：检查编辑权限
    if (mode === 'lock' && doc.editLock && doc.editLock !== socket.id) {
      socket.emit('edit-denied', {
        reason: '文档正在被其他用户编辑',
        lockedBy: doc.activeUsers.get(doc.editLock)?.name
      });
      return;
    }
    
    // 乐观锁模式：基于版本号解决冲突
    if (mode === 'optimistic' && version < doc.version) {
      // 版本冲突，需要客户端合并
      socket.emit('version-conflict', {
        serverVersion: doc.version,
        serverContent: doc.content
      });
      return;
    }
    
    // 应用变更
    if (changes) {
      // 保存历史记录
      doc.history.push({
        version: doc.version + 1,
        changes: changes,
        userId: userInfo.id,
        userName: userInfo.name,
        timestamp: new Date()
      });
      
      // 限制历史记录数量
      if (doc.history.length > 50) {
        doc.history = doc.history.slice(-50);
      }
      
      // 更新文档内容和版本
      if (changes.fullContent) {
        doc.content = changes.fullContent;
      }
      doc.version++;
      doc.lastModified = new Date();
    }
    
    // 广播变更给其他用户
    socket.to(documentId).emit('document-updated', {
      changes: changes,
      version: doc.version,
      updatedBy: {
        id: userInfo.id,
        name: userInfo.name
      },
      timestamp: doc.lastModified
    });
    
    // 确认收到变更
    socket.emit('change-acknowledged', {
      version: doc.version
    });
  }

  /**
   * 处理光标移动
   */
  handleCursorMove(socket, { documentId, position }) {
    const userInfo = this.users.get(socket.id);
    if (!userInfo) return;
    
    // 广播光标位置给其他用户
    socket.to(documentId).emit('cursor-moved', {
      userId: userInfo.id,
      userName: userInfo.name,
      color: userInfo.color,
      position: position
    });
  }

  /**
   * 处理选择区域变更
   */
  handleSelectionChange(socket, { documentId, selection }) {
    const userInfo = this.users.get(socket.id);
    if (!userInfo) return;
    
    // 广播选择区域给其他用户
    socket.to(documentId).emit('selection-changed', {
      userId: userInfo.id,
      userName: userInfo.name,
      color: userInfo.color,
      selection: selection
    });
  }

  /**
   * 处理保存文档请求
   */
  handleSaveDocument(socket, { documentId, content, title }) {
    const userInfo = this.users.get(socket.id);
    if (!userInfo) return;
    
    const doc = this.documents.get(documentId);
    if (!doc) return;
    
    // 更新文档
    doc.content = content;
    if (title) doc.title = title;
    doc.lastModified = new Date();
    doc.version++;
    
    // 通知所有用户文档已保存
    this.io.to(documentId).emit('document-saved', {
      savedBy: {
        id: userInfo.id,
        name: userInfo.name
      },
      version: doc.version,
      timestamp: doc.lastModified
    });
    
    console.log(`文档 ${documentId} 已保存，用户: ${userInfo.name}`);
  }

  /**
   * 处理用户断开连接
   */
  handleDisconnect(socket) {
    const userInfo = this.users.get(socket.id);
    if (!userInfo) return;
    
    const { documentId } = userInfo;
    const doc = this.documents.get(documentId);
    
    if (doc) {
      // 释放编辑锁
      if (doc.editLock === socket.id) {
        doc.editLock = null;
      }
      
      doc.activeUsers.delete(socket.id);
      
      // 通知其他用户
      this.io.to(documentId).emit('user-left', {
        userId: userInfo.id,
        userCount: doc.activeUsers.size
      });
    }
    
    this.users.delete(socket.id);
    console.log(`用户断开连接: ${userInfo.name}`);
  }

  /**
   * 获取在线用户列表
   */
  handleGetUsers(socket, { documentId }) {
    const doc = this.documents.get(documentId);
    if (!doc) {
      socket.emit('users-list', { users: [] });
      return;
    }
    
    const users = Array.from(doc.activeUsers.values()).map(u => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      color: u.color,
      isEditing: u.isEditing,
      joinedAt: u.joinedAt
    }));
    
    socket.emit('users-list', { users });
  }

  /**
   * 处理聊天消息
   */
  handleChatMessage(socket, { documentId, message, type = 'text' }) {
    const userInfo = this.users.get(socket.id);
    if (!userInfo) return;
    
    const chatMessage = {
      id: uuidv4(),
      userId: userInfo.id,
      userName: userInfo.name,
      userAvatar: userInfo.avatar,
      type: type,
      content: message,
      timestamp: new Date()
    };
    
    // 广播消息给所有用户
    this.io.to(documentId).emit('chat-message', chatMessage);
  }

  /**
   * 请求编辑权限（悲观锁模式）
   */
  handleRequestEdit(socket, { documentId }) {
    const userInfo = this.users.get(socket.id);
    if (!userInfo) return;
    
    const doc = this.documents.get(documentId);
    if (!doc) return;
    
    if (doc.editLock === null || doc.editLock === socket.id) {
      doc.editLock = socket.id;
      userInfo.isEditing = true;
      
      // 通知用户获得编辑权限
      socket.emit('edit-granted', {
        documentId: documentId,
        lockedBy: userInfo.name
      });
      
      // 通知其他用户文档被锁定
      socket.to(documentId).emit('document-locked', {
        lockedBy: {
          id: userInfo.id,
          name: userInfo.name
        }
      });
    } else {
      const lockedBy = doc.activeUsers.get(doc.editLock);
      socket.emit('edit-denied', {
        reason: '文档正在被编辑',
        lockedBy: lockedBy?.name || '其他用户'
      });
    }
  }

  /**
   * 释放编辑权限
   */
  handleReleaseEdit(socket, { documentId }) {
    const userInfo = this.users.get(socket.id);
    if (!userInfo) return;
    
    const doc = this.documents.get(documentId);
    if (!doc) return;
    
    if (doc.editLock === socket.id) {
      doc.editLock = null;
      userInfo.isEditing = false;
      
      // 通知用户已释放编辑权限
      socket.emit('edit-released', {
        documentId: documentId
      });
      
      // 通知其他用户文档已解锁
      socket.to(documentId).emit('document-unlocked', {
        releasedBy: {
          id: userInfo.id,
          name: userInfo.name
        }
      });
    }
  }

  /**
   * 为用户分配颜色
   */
  getUserColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#6C5CE7',
      '#A29BFE', '#74B9FF', '#00B894', '#E17055', '#FD79A8'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 获取文档统计信息
   */
  getDocumentStats(documentId) {
    const doc = this.documents.get(documentId);
    if (!doc) return null;
    
    return {
      id: doc.id,
      version: doc.version,
      userCount: doc.activeUsers.size,
      lastModified: doc.lastModified,
      historyCount: doc.history.length
    };
  }

  /**
   * 清理不活跃的文档
   */
  cleanupInactiveDocuments(maxInactiveTime = 30 * 60 * 1000) {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [documentId, doc] of this.documents) {
      // 如果没有活跃用户且长时间未修改
      if (doc.activeUsers.size === 0 && 
          now - doc.lastModified.getTime() > maxInactiveTime) {
        this.documents.delete(documentId);
        cleanedCount++;
      }
    }
    
    console.log(`清理了 ${cleanedCount} 个不活跃文档`);
    return cleanedCount;
  }
}

module.exports = CollaborationService;
