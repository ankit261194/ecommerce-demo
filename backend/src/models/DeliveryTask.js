const mongoose = require('mongoose');

const deliveryTaskSchema = new mongoose.Schema(
  {
    subOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubOrder',
      required: true,
      unique: true,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pickupLocation: {
      storeName: String,
      phone: String,
      address: String,
    },
    dropLocation: {
      recipientName: String,
      phone: String,
      address: String,
      pincode: String,
    },
    status: {
      type: String,
      enum: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED'],
      default: 'ASSIGNED',
    },
    isCod: {
      type: Boolean,
      default: false,
    },
    amountToCollect: {
      type: Number,
      default: 0,
    },
    amountCollected: {
      type: Number,
      default: 0,
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryTask', deliveryTaskSchema);
