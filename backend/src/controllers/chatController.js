const ChatInquiry = require('../models/ChatInquiry');
const VendorProfile = require('../models/VendorProfile');
const Product = require('../models/Product');
const User = require('../models/User');

// Helper to resolve VendorProfile for current user
const resolveVendorProfile = async (req) => {
  if (req.vendorProfile) return req.vendorProfile;
  if (req.user?.vendorProfile) {
    const vp = await VendorProfile.findById(req.user.vendorProfile);
    if (vp) return vp;
  }
  return await VendorProfile.findOne({ user: req.user._id });
};

// @desc    Initiate or append customer inquiry with a merchant
// @route   POST /api/chat/inquiries
// @access  Private (Customer / SuperAdmin)
exports.createCustomerInquiry = async (req, res, next) => {
  try {
    const { vendorId, productId, text, subject } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry message text cannot be empty.',
      });
    }

    let targetVendorId = vendorId;
    let productDoc = null;
    let productSnapshot = {
      title: 'General Merchant Inquiry',
      image: '',
      price: 0,
      sku: '',
      category: 'General',
    };

    if (productId) {
      productDoc = await Product.findById(productId);
      if (productDoc) {
        if (!targetVendorId) {
          targetVendorId = productDoc.vendor;
        }
        productSnapshot = {
          title: productDoc.title,
          image: productDoc.thumbnail || (productDoc.images && productDoc.images[0]) || '',
          price: productDoc.sellingPrice || productDoc.price || 0,
          sku: productDoc.sku || '',
          category: productDoc.category || 'General',
        };
      }
    }

    if (!targetVendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required to initiate a merchant inquiry.',
      });
    }

    const vendorDoc = await VendorProfile.findById(targetVendorId);
    if (!vendorDoc) {
      return res.status(404).json({
        success: false,
        message: 'Target merchant store not found.',
      });
    }

    // Check if an active open/in-progress inquiry exists for the same customer, vendor, and product
    const existingQuery = {
      customer: req.user._id,
      vendor: vendorDoc._id,
      status: { $in: ['open', 'in_progress'] },
    };
    if (productDoc) {
      existingQuery.product = productDoc._id;
    } else {
      existingQuery.$or = [{ product: null }, { product: { $exists: false } }];
    }
    let inquiry = await ChatInquiry.findOne(existingQuery).sort({ updatedAt: -1 });

    const newMessage = {
      sender: 'customer',
      senderUser: req.user._id,
      senderName: req.user.name || 'Valued Customer',
      text: text.trim(),
      timestamp: new Date(),
      read: false,
    };

    if (inquiry) {
      inquiry.messages.push(newMessage);
      inquiry.lastMessage = text.trim();
      inquiry.lastMessageSender = 'customer';
      inquiry.lastMessageAt = new Date();
      inquiry.unreadByVendor += 1;
      inquiry.status = 'open';
      await inquiry.save();
    } else {
      inquiry = await ChatInquiry.create({
        customer: req.user._id,
        vendor: vendorDoc._id,
        product: productDoc ? productDoc._id : undefined,
        productSnapshot,
        subject: subject || (productDoc ? `Inquiry regarding ${productDoc.title}` : `Inquiry for ${vendorDoc.storeName}`),
        messages: [newMessage],
        lastMessage: text.trim(),
        lastMessageSender: 'customer',
        lastMessageAt: new Date(),
        unreadByVendor: 1,
        unreadByCustomer: 0,
        status: 'open',
      });
    }

    await inquiry.populate([
      { path: 'customer', select: 'name email phone avatar' },
      { path: 'vendor', select: 'storeName logo storeSlug rating phone email' },
      { path: 'product', select: 'title thumbnail sellingPrice stock sku' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Inquiry dispatched to merchant successfully.',
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer's active chat inquiries
// @route   GET /api/chat/customer/inquiries
// @access  Private (Customer)
exports.getCustomerInquiries = async (req, res, next) => {
  try {
    const inquiries = await ChatInquiry.find({ customer: req.user._id })
      .populate('vendor', 'storeName logo storeSlug rating email phone')
      .populate('product', 'title thumbnail sellingPrice stock')
      .sort({ lastMessageAt: -1 });

    const totalUnread = inquiries.reduce((sum, item) => sum + (item.unreadByCustomer || 0), 0);

    res.status(200).json({
      success: true,
      count: inquiries.length,
      totalUnread,
      data: inquiries,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer inquiry details and mark customer messages as read
// @route   GET /api/chat/customer/inquiries/:id
// @access  Private (Customer)
exports.getCustomerInquiryById = async (req, res, next) => {
  try {
    const inquiry = await ChatInquiry.findById(req.params.id)
      .populate('vendor', 'storeName logo storeSlug rating email phone')
      .populate('product', 'title thumbnail sellingPrice stock');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry thread not found.',
      });
    }

    const customerId = String(inquiry.customer?._id || inquiry.customer);
    if (customerId !== String(req.user._id) && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this inquiry thread.',
      });
    }

    // Mark vendor messages as read by customer
    let updated = false;
    inquiry.messages.forEach((msg) => {
      if (msg.sender === 'vendor' && !msg.read) {
        msg.read = true;
        updated = true;
      }
    });

    if (inquiry.unreadByCustomer > 0 || updated) {
      inquiry.unreadByCustomer = 0;
      await inquiry.save();
    }

    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Customer sends a follow-up reply to an inquiry
// @route   POST /api/chat/customer/inquiries/:id/reply
// @access  Private (Customer)
exports.customerReplyInquiry = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply text cannot be empty.',
      });
    }

    const inquiry = await ChatInquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry thread not found.',
      });
    }

    const customerId = String(inquiry.customer?._id || inquiry.customer);
    if (customerId !== String(req.user._id) && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reply to this inquiry thread.',
      });
    }

    const newMessage = {
      sender: 'customer',
      senderUser: req.user._id,
      senderName: req.user.name || 'Valued Customer',
      text: text.trim(),
      timestamp: new Date(),
      read: false,
    };

    inquiry.messages.push(newMessage);
    inquiry.lastMessage = text.trim();
    inquiry.lastMessageSender = 'customer';
    inquiry.lastMessageAt = new Date();
    inquiry.unreadByVendor += 1;
    if (inquiry.status === 'resolved' || inquiry.status === 'closed') {
      inquiry.status = 'open'; // Reopen upon buyer follow-up
    }
    await inquiry.save();

    await inquiry.populate([
      { path: 'customer', select: 'name email phone avatar' },
      { path: 'vendor', select: 'storeName logo storeSlug rating' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Reply sent to merchant successfully.',
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all inquiries for vendor store
// @route   GET /api/chat/vendor/inquiries
// @access  Private (Vendor / Vendor Staff)
exports.getVendorInquiries = async (req, res, next) => {
  try {
    const vendorProfile = await resolveVendorProfile(req);
    if (!vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found for this account.',
      });
    }

    const { status, search } = req.query;
    const filter = { vendor: vendorProfile._id };

    if (status && status !== 'all') {
      if (status === 'unread') {
        filter.unreadByVendor = { $gt: 0 };
      } else if (status === 'open') {
        filter.status = { $in: ['open', 'in_progress'] };
      } else {
        filter.status = status;
      }
    }

    let inquiries = await ChatInquiry.find(filter)
      .populate('customer', 'name email phone avatar')
      .populate('product', 'title thumbnail sellingPrice stock sku')
      .sort({ lastMessageAt: -1 });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      inquiries = inquiries.filter((inq) => {
        const custName = inq.customer?.name?.toLowerCase() || '';
        const prodTitle = inq.productSnapshot?.title?.toLowerCase() || '';
        const lastMsg = inq.lastMessage?.toLowerCase() || '';
        return custName.includes(q) || prodTitle.includes(q) || lastMsg.includes(q);
      });
    }

    const totalUnread = inquiries.reduce((sum, item) => sum + (item.unreadByVendor || 0), 0);

    res.status(200).json({
      success: true,
      count: inquiries.length,
      totalUnread,
      data: inquiries,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get fast summary metrics of vendor chat inbox
// @route   GET /api/chat/vendor/summary
// @access  Private (Vendor / Vendor Staff)
exports.getVendorChatSummary = async (req, res, next) => {
  try {
    const vendorProfile = await resolveVendorProfile(req);
    if (!vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found.',
      });
    }

    const totalInquiries = await ChatInquiry.countDocuments({ vendor: vendorProfile._id });
    const openCount = await ChatInquiry.countDocuments({
      vendor: vendorProfile._id,
      status: { $in: ['open', 'in_progress'] },
    });
    const resolvedCount = await ChatInquiry.countDocuments({
      vendor: vendorProfile._id,
      status: 'resolved',
    });

    const unreadAgg = await ChatInquiry.aggregate([
      { $match: { vendor: vendorProfile._id } },
      { $group: { _id: null, totalUnread: { $sum: '$unreadByVendor' } } },
    ]);
    const totalUnread = unreadAgg[0]?.totalUnread || 0;

    res.status(200).json({
      success: true,
      data: {
        totalInquiries,
        openCount,
        resolvedCount,
        totalUnread,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vendor inquiry details and mark customer messages as read
// @route   GET /api/chat/vendor/inquiries/:id
// @access  Private (Vendor / Vendor Staff)
exports.getVendorInquiryById = async (req, res, next) => {
  try {
    const vendorProfile = await resolveVendorProfile(req);
    if (!vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found.',
      });
    }

    const inquiry = await ChatInquiry.findById(req.params.id)
      .populate('customer', 'name email phone avatar')
      .populate('product', 'title thumbnail sellingPrice stock sku');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry thread not found.',
      });
    }

    const vendorId = String(inquiry.vendor?._id || inquiry.vendor);
    if (vendorId !== String(vendorProfile._id) && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view inquiries for this merchant.',
      });
    }

    // Mark customer messages as read by vendor
    let updated = false;
    inquiry.messages.forEach((msg) => {
      if (msg.sender === 'customer' && !msg.read) {
        msg.read = true;
        updated = true;
      }
    });

    if (inquiry.unreadByVendor > 0 || updated) {
      inquiry.unreadByVendor = 0;
      await inquiry.save();
    }

    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Vendor replies to a customer inquiry
// @route   POST /api/chat/vendor/inquiries/:id/reply
// @access  Private (Vendor / Vendor Staff)
exports.vendorReplyInquiry = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Merchant reply text cannot be empty.',
      });
    }

    const vendorProfile = await resolveVendorProfile(req);
    if (!vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found.',
      });
    }

    const inquiry = await ChatInquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry thread not found.',
      });
    }

    const vendorId = String(inquiry.vendor?._id || inquiry.vendor);
    if (vendorId !== String(vendorProfile._id) && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reply to inquiries for this merchant.',
      });
    }

    const senderTitle = req.user.staffRoleTitle ? `${req.user.name} (${req.user.staffRoleTitle})` : vendorProfile.storeName;

    const newMessage = {
      sender: 'vendor',
      senderUser: req.user._id,
      senderName: senderTitle,
      text: text.trim(),
      timestamp: new Date(),
      read: false,
    };

    inquiry.messages.push(newMessage);
    inquiry.lastMessage = text.trim();
    inquiry.lastMessageSender = 'vendor';
    inquiry.lastMessageAt = new Date();
    inquiry.unreadByCustomer += 1;
    inquiry.status = 'in_progress';
    await inquiry.save();

    await inquiry.populate([
      { path: 'customer', select: 'name email phone avatar' },
      { path: 'vendor', select: 'storeName logo storeSlug rating' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Official merchant response sent to customer successfully.',
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update inquiry status (e.g., mark resolved / open / closed)
// @route   PATCH /api/chat/vendor/inquiries/:id/status
// @access  Private (Vendor / Vendor Staff)
exports.updateInquiryStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['open', 'in_progress', 'resolved', 'closed'];

    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowed.join(', ')}`,
      });
    }

    const vendorProfile = await resolveVendorProfile(req);
    if (!vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found.',
      });
    }

    const inquiry = await ChatInquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry thread not found.',
      });
    }

    const vendorId = String(inquiry.vendor?._id || inquiry.vendor);
    if (vendorId !== String(vendorProfile._id) && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this inquiry.',
      });
    }

    inquiry.status = status;
    await inquiry.save();

    res.status(200).json({
      success: true,
      message: `Inquiry status updated to '${status}'.`,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
};
