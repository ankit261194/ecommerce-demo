const mongoose = require('mongoose');

const FaqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
      maxlength: 300,
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['GENERAL', 'ORDERS', 'PAYMENTS', 'SHIPPING', 'RETURNS', 'VENDORS'],
      default: 'GENERAL',
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    unhelpfulCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

FaqSchema.index({ category: 1, displayOrder: 1 });

module.exports = mongoose.model('Faq', FaqSchema);
