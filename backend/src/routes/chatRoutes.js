const express = require('express');
const router = express.Router();
const {
  createCustomerInquiry,
  getCustomerInquiries,
  getCustomerInquiryById,
  customerReplyInquiry,
  getVendorInquiries,
  getVendorChatSummary,
  getVendorInquiryById,
  vendorReplyInquiry,
  updateInquiryStatus,
} = require('../controllers/chatController');
const { protect, authorize, requireVendorPermission } = require('../middlewares/auth');

// Customer Chat Endpoints
router.post('/inquiries', protect, createCustomerInquiry);
router.get('/customer/inquiries', protect, getCustomerInquiries);
router.get('/customer/inquiries/:id', protect, getCustomerInquiryById);
router.post('/customer/inquiries/:id/reply', protect, customerReplyInquiry);

// Vendor & Sub-Staff Chat Inbox Endpoints
router.get('/vendor/summary', protect, authorize('vendor', 'vendor_staff', 'superadmin'), getVendorChatSummary);
router.get('/vendor/inquiries', protect, authorize('vendor', 'vendor_staff', 'superadmin'), requireVendorPermission('REVIEWS_MANAGE'), getVendorInquiries);
router.get('/vendor/inquiries/:id', protect, authorize('vendor', 'vendor_staff', 'superadmin'), requireVendorPermission('REVIEWS_MANAGE'), getVendorInquiryById);
router.post('/vendor/inquiries/:id/reply', protect, authorize('vendor', 'vendor_staff', 'superadmin'), requireVendorPermission('REVIEWS_MANAGE'), vendorReplyInquiry);
router.patch('/vendor/inquiries/:id/status', protect, authorize('vendor', 'vendor_staff', 'superadmin'), requireVendorPermission('REVIEWS_MANAGE'), updateInquiryStatus);

module.exports = router;
