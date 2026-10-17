const mongoose = require('mongoose');

const cloudAssetSchema = new mongoose.Schema(
  {
    fileKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      default: 0,
    },
    size: {
      type: Number,
      default: function () {
        return this.fileSize;
      },
    },
    publicUrl: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      enum: ['s3', 'r2', 'wasabi', 'spaces', 'local', 'cloudinary'],
      default: 's3',
    },
    folder: {
      type: String,
      default: 'products',
      trim: true,
    },
    bucket: {
      type: String,
      default: '',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure virtual or query compatibility for both size and fileSize
cloudAssetSchema.pre('save', function (next) {
  if (this.fileSize && !this.size) {
    this.size = this.fileSize;
  } else if (this.size && !this.fileSize) {
    this.fileSize = this.size;
  }
  next();
});

module.exports = mongoose.model('CloudAsset', cloudAssetSchema);
