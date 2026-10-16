const mongoose = require('mongoose');

const poolMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      default: 'Shopper',
    },
    avatar: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    orderNumber: {
      type: String,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PENDING', 'COD_HELD'],
      default: 'PAID',
    },
    isCreator: {
      type: Boolean,
      default: false,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const groupBuyPoolSchema = new mongoose.Schema(
  {
    poolCode: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productTitle: {
      type: String,
      default: '',
    },
    productImage: {
      type: String,
      default: '',
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    creatorName: {
      type: String,
      default: 'Shopper',
    },
    requiredMembers: {
      type: Number,
      required: true,
      default: 2,
      min: 2,
      max: 10,
    },
    currentMembers: {
      type: Number,
      default: 1,
    },
    soloPrice: {
      type: Number,
      required: true,
    },
    groupPrice: {
      type: Number,
      required: true,
    },
    savingsAmount: {
      type: Number,
      required: true,
    },
    discountPercentage: {
      type: Number,
      default: 20,
    },
    status: {
      type: String,
      enum: ['OPEN', 'COMPLETED', 'EXPIRED', 'CANCELLED'],
      default: 'OPEN',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    members: [poolMemberSchema],
    shareUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

groupBuyPoolSchema.virtual('spotsLeft').get(function () {
  return Math.max(0, this.requiredMembers - this.currentMembers);
});

groupBuyPoolSchema.virtual('isExpired').get(function () {
  return this.status === 'EXPIRED' || (this.status === 'OPEN' && new Date() > this.expiresAt);
});

groupBuyPoolSchema.set('toJSON', { virtuals: true });
groupBuyPoolSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GroupBuyPool', groupBuyPoolSchema);
