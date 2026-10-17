const mongoose = require('mongoose');

const staffRoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide role name'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Please provide unique role code'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    department: {
      type: String,
      enum: ['Operations', 'Finance', 'Catalog', 'Support', 'Marketing', 'Executive', 'Logistics', 'System'],
      default: 'Operations',
    },
    permissions: {
      type: [String],
      default: [],
    },
    isSystemRole: {
      type: Boolean,
      default: false,
    },
    assignedStaffCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.StaffRole || mongoose.model('StaffRole', staffRoleSchema);
