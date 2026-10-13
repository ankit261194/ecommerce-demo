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
        'DAILY_CHECKIN',
        'ORDER_REFUND',
        'WELCOME_BONUS',
        'SCRATCH_CARD',
        'ADMIN_CREDIT',
        'ADJUSTMENT',
      ],
      default: 'COIN_REDEMPTION',
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
