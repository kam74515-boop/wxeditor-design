const bcrypt = require('bcryptjs');
const db = require('../config/database');

class User {
  constructor(data) {
    Object.assign(this, data);
    
    // Parse JSON settings if it exists as a string
    if (typeof this.settings === 'string') {
      try {
        this.settings = JSON.parse(this.settings);
      } catch (e) {
        this.settings = {};
      }
    } else if (!this.settings) {
      this.settings = {};
    }

    // Default membership
    if (!this.membership) {
      this.membership = this.settings.membership || {
        type: 'free',
        isActive: false
      };
    }
  }

  // Virtual property equivalents
  get _id() {
    return this.id;
  }

  get isMember() {
    if (!this.membership || !this.membership.isActive) return false;
    return this.membership.endDate ? new Date(this.membership.endDate) > new Date() : false;
  }

  get membershipDaysLeft() {
    if (!this.isMember) return 0;
    return Math.ceil((new Date(this.membership.endDate) - new Date()) / (1000 * 60 * 60 * 24));
  }

  // settings 代理字段
  get bio() { return this.settings.bio || ''; }
  set bio(val) { this.settings.bio = val; }

  get phone() { return this.settings.phone || ''; }
  set phone(val) { this.settings.phone = val; }

  // Verify password
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Check if password changed after token was issued
  changedPasswordAfter(JWTTimestamp) {
    const passwordChangedAt = this.settings.passwordChangedAt;
    if (passwordChangedAt) {
      const changedTimestamp = parseInt(new Date(passwordChangedAt).getTime() / 1000, 10);
      return JWTTimestamp < changedTimestamp;
    }
    return false;
  }

  // Check if account is locked
  isLocked() {
    const lockUntil = this.settings.lockUntil;
    return !!(lockUntil && new Date(lockUntil) > new Date());
  }

  // Record a failed login attempt
  async incLoginAttempts() {
    let loginAttempts = this.settings.loginAttempts || 0;
    let lockUntil = this.settings.lockUntil;

    if (lockUntil && new Date(lockUntil) < new Date()) {
      loginAttempts = 1;
      lockUntil = null;
    } else {
      loginAttempts += 1;
      if (loginAttempts >= 5 && !this.isLocked()) {
        lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      }
    }

    this.settings.loginAttempts = loginAttempts;
    this.settings.lockUntil = lockUntil;
    
    await this.save();
  }
  
  // Default limits verification
  checkLimits() {
    return User.getLimitsByMembership(this.membership.type || 'free');
  }

  // Save changes back to SQLite database
  async save() {
    // Encrypt password if string has changed and doesn't look like a bcrypt hash 
    // (bcrypt hash starts with $2a$ or $2b$)
    if (this.password && !this.password.startsWith('$2')) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      this.settings.passwordChangedAt = new Date().toISOString();
    }

    const stmt = db.prepare(`
      UPDATE users 
      SET username = ?, email = ?, password = ?, nickname = ?, avatar = ?, role = ?, status = ?, settings = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      this.username,
      this.email,
      this.password,
      this.nickname,
      this.avatar,
      this.role || 'user',
      this.status || 'active',
      JSON.stringify(this.settings),
      this.id
    );
  }

  // ------------- Static Methods for Database Access -------------

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id);
    return row ? new User(row) : null;
  }

  static findOne({ username, email } = {}) {
    if (username && email) {
      const row = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);
      return row ? new User(row) : null;
    }
    if (username) {
      const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      return row ? new User(row) : null;
    }
    if (email) {
      const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      return row ? new User(row) : null;
    }
    return null;
  }
  
  static async create(userData) {
    const { username, email, password, nickname } = userData;
    // Hash password before insert
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const stmt = db.prepare(`
      INSERT INTO users (username, email, password, nickname, role, status, settings)
      VALUES (?, ?, ?, ?, 'user', 'active', '{}')
    `);
    
    const info = stmt.run(username, email, hashedPassword, nickname || username);
    return User.findById(info.lastInsertRowid);
  }

  static getLimitsByMembership(type) {
    const limits = {
      free: {
        documents: 10,
        storage: 100, // MB
        collaborators: 3,
        apiCalls: 100
      },
      basic: {
        documents: 50,
        storage: 1024, // 1GB
        collaborators: 10,
        apiCalls: 1000
      },
      pro: {
        documents: 200,
        storage: 5120, // 5GB
        collaborators: 50,
        apiCalls: 10000
      },
      enterprise: {
        documents: -1, // 无限
        storage: -1, // 无限
        collaborators: -1, // 无限
        apiCalls: -1 // 无限
      }
    };
    return limits[type] || limits.free;
  }
}

module.exports = User;
