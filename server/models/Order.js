const mongoose = require('mongoose');

/**
 * 会员订单模型
 */
const orderSchema = new mongoose.Schema({
  // 订单号
  orderNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 用户
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 会员类型
  membershipType: {
    type: String,
    enum: ['basic', 'pro', 'enterprise'],
    required: true
  },
  
  // 套餐周期
  period: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    required: true
  },
  
  // 金额
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // 货币
  currency: {
    type: String,
    default: 'CNY'
  },
  
  // 原价（用于显示折扣）
  originalAmount: {
    type: Number
  },
  
  // 折扣信息
  discount: {
    code: String,
    amount: Number,
    percentage: Number
  },
  
  // 支付信息
  payment: {
    method: {
      type: String,
      enum: ['alipay', 'wechat', 'paypal', 'card'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date,
    failedReason: String,
    refundedAt: Date,
    refundAmount: Number,
    refundReason: String
  },
  
  // 会员有效期
  membership: {
    startDate: Date,
    endDate: Date,
    isAutoRenew: {
      type: Boolean,
      default: false
    }
  },
  
  // 发票信息
  invoice: {
    type: { type: String, enum: ['personal', 'company'] },
    title: String,
    taxNumber: String,
    address: String,
    phone: String,
    bankName: String,
    bankAccount: String,
    email: String,
    status: {
      type: String,
      enum: ['pending', 'issued', 'delivered'],
      default: 'pending'
    },
    issuedAt: Date
  },
  
  // 订单备注
  remark: String,
  
  // 推广信息
  referrer: {
    code: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    commission: Number
  },
  
  // 设备信息
  device: {
    ip: String,
    userAgent: String,
    platform: String
  },
  
  // 取消信息
  cancelledAt: Date,
  cancelReason: String,
  
  // 最后更新时间
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ membershipType: 1 });
orderSchema.index({ orderNo: 'text' });

// 静态方法：生成订单号
orderSchema.statics.generateOrderNo = function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `WX${year}${month}${day}${random}`;
};

// 实例方法：计算有效期
orderSchema.methods.calculateMembershipDates = function() {
  const now = new Date();
  const endDate = new Date(now);
  
  switch (this.period) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'quarterly':
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case 'yearly':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    default:
      endDate.setMonth(endDate.getMonth() + 1);
  }
  
  return { startDate: now, endDate };
};

// 实例方法：标记支付成功
orderSchema.methods.markAsPaid = async function(transactionId) {
  const dates = this.calculateMembershipDates();
  
  this.payment.status = 'success';
  this.payment.transactionId = transactionId;
  this.payment.paidAt = new Date();
  this.membership.startDate = dates.startDate;
  this.membership.endDate = dates.endDate;
  this.lastUpdatedAt = new Date();
  
  return this.save();
};

// 实例方法：退款
orderSchema.methods.refund = async function(amount, reason) {
  this.payment.status = 'refunded';
  this.payment.refundedAt = new Date();
  this.payment.refundAmount = amount;
  this.payment.refundReason = reason;
  this.lastUpdatedAt = new Date();
  
  return this.save();
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
