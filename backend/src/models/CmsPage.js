const mongoose = require('mongoose');

const CmsPageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Page title is required'],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: [true, 'Page slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must only contain lowercase alphanumeric characters and hyphens'],
    },
    category: {
      type: String,
      enum: ['LEGAL', 'COMPANY', 'HELP', 'POLICIES'],
      default: 'LEGAL',
    },
    contentHtml: {
      type: String,
      required: [true, 'Page content is required'],
    },
    metaTitle: {
      type: String,
      trim: true,
      default: '',
    },
    metaDescription: {
      type: String,
      trim: true,
      default: '',
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

CmsPageSchema.index({ category: 1, isPublished: 1 });

module.exports = mongoose.model('CmsPage', CmsPageSchema);
