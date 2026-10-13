const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  answer: {
    type: String,
    required: true,
    trim: true,
  },
  answeredBy: {
    type: String,
    required: true,
    default: 'Official Seller',
  },
  isVendor: {
    type: Boolean,
    default: true,
  },
  isOfficial: {
    type: Boolean,
    default: true,
  },
  upvotes: {
    type: Number,
    default: 0,
  },
  answeredAt: {
    type: Date,
    default: Date.now,
  },
});

const questionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    askedBy: {
      type: String,
      required: true,
      default: 'Verified Shopper',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    upvotes: {
      type: Number,
      default: 0,
    },
    answers: [answerSchema],
    isApproved: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', questionSchema);
