const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['CREDIT', 'DEBIT'],
      required: true,
    },
    currency: {
      type: String,
      enum: ['INR', 'COINS'],
      default: 'COINS',
    },
    amount: {
      type: Number,
      required: true, // Amount in ₹ or count of coins
    },
    category: {
      type: String,
      enum: [
        'CASHBACK',
        'COIN_REDEMPTION',
        'WALLET_PAYMENT',
        'WALLET_TOPUP',
        'BONUS_CREDIT',
        'DAILY_CHECKIN',
        'ORDER_REFUND',
        'RETURN_REFUND',
        'WELCOME_BONUS',
        'SCRATCH_CARD',
        'ADMIN_CREDIT',
        'ADMIN_DEBIT',
        'ADMIN_ADJUSTMENT',
        'ADJUSTMENT',
        'REWARD_POINTS',
        'SPLIT_PAYMENT',
        'PARTIAL_COD_ADVANCE',
        'RIDER_TIP',
        'SPF_COMPENSATION',
        'ESCROW_RELEASE',
      ],
      default: 'COIN_REDEMPTION',
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'CARD', 'NETBANKING', 'RAZORPAY', 'STRIPE', 'PHONEPE', 'SYSTEM', 'COINS', 'WALLET'],
      default: 'UPI',
    },
    transactionReference: {
      type: String,
      default: '',
      index: true,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'PENDING', 'FAILED', 'REVERSED'],
      default: 'SUCCESS',
    },
    bonusAmount: {
      type: Number,
      default: 0,
    },
    bonusCoins: {
      type: Number,
      default: 0,
    },
    promoCode: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    orderNumber: {
      type: String,
      default: null,
    },
    balanceAfter: {
      type: Number,
      default: 0,
    },
    coinsAfter: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
