const Faq = require('../models/Faq');

const DEFAULT_FAQS = [
  {
    category: 'ORDERS',
    question: 'How do multi-vendor split orders work on AuraMarket?',
    answer: 'When you purchase products from multiple independent merchants in a single checkout, AuraMarket automatically generates dedicated sub-orders for each vendor. Each seller packages and dispatches their portion independently, complete with dedicated tracking numbers and secret delivery OTPs.',
    displayOrder: 1,
    isPublished: true,
  },
  {
    category: 'ORDERS',
    question: 'How do I track my courier delivery in real time?',
    answer: 'Go to your Customer Orders Center and tap "Track Live Order". You can inspect step-by-step dispatch milestones, live rider GPS telemetry, estimated arrival SLA, and your confidential 4-digit delivery OTP.',
    displayOrder: 2,
    isPublished: true,
  },
  {
    category: 'PAYMENTS',
    question: 'What payment methods does AuraMarket support?',
    answer: 'We support 100% secure checkout via Razorpay, Stripe Cards, instant UPI QR (PhonePe, GPay, Paytm), AuraMarket In-App Wallet Coins, and Cash on Delivery (COD) in verified zones.',
    displayOrder: 3,
    isPublished: true,
  },
  {
    category: 'PAYMENTS',
    question: 'How does Cash on Delivery (COD) serviceability work?',
    answer: 'Use our real-time Pincode Checker on any product page. If your area qualifies for standard COD, you can pay in cash or UPI upon delivery. High-risk or outpost pincodes require prepaid payment via RTO Guard protection.',
    displayOrder: 4,
    isPublished: true,
  },
  {
    category: 'RETURNS',
    question: 'How does the 1-Click Product Exchange & Reverse Pickup work?',
    answer: 'If an apparel or footwear item does not fit, click "Request 1-Click Exchange" within 7 days of delivery. Select your preferred replacement size or color; our system immediately reserves stock and assigns a doorstep reverse courier. Handover is secured with a 4-digit reverse pickup OTP.',
    displayOrder: 5,
    isPublished: true,
  },
  {
    category: 'RETURNS',
    question: 'When is my refund credited following order cancellation or return?',
    answer: 'Prepaid order cancellations receive instant refunds to your AuraMarket Wallet Coins balance (100% redeemable on future orders) or in 3 to 5 business days to your original bank/credit card.',
    displayOrder: 6,
    isPublished: true,
  },
  {
    category: 'SHIPPING',
    question: 'What are the delivery SLAs and shipping charges?',
    answer: 'Metro locations receive express delivery within 24 to 48 hours. Tier 2 and Tier 3 cities arrive in 2 to 4 business days. Orders above the threshold qualify for 100% free shipping as shown in your cart meter.',
    displayOrder: 7,
    isPublished: true,
  },
  {
    category: 'VENDORS',
    question: 'How can independent merchants register to sell on AuraMarket?',
    answer: 'Visit the Vendor Central Portal, submit your Store Profile, tax/GST registration, and business documents via Vendor KYC Manager. Once approved by Super Admin, start listing products and enjoying automated instant payout splits.',
    displayOrder: 8,
    isPublished: true,
  },
];

// Seed Helper
exports.seedDefaultFaqs = async () => {
  for (const faq of DEFAULT_FAQS) {
    const existing = await Faq.findOne({ question: faq.question });
    if (!existing) {
      await Faq.create(faq);
    }
  }
};

// GET /api/faqs
exports.getFaqs = async (req, res) => {
  try {
    const { category, search, all } = req.query;
    const query = {};

    const isAdmin = req.user && (req.user.role === 'superadmin' || req.user.role === 'SUPER_ADMIN');

    if (category && category !== 'ALL') {
      query.category = category.toUpperCase();
    }

    if (search && search.trim() !== '') {
      query.$or = [
        { question: { $regex: search.trim(), $options: 'i' } },
        { answer: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (!isAdmin && all !== 'true') {
      query.isPublished = true;
    }

    const faqs = await Faq.find(query).sort({ category: 1, displayOrder: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: faqs.length,
      data: faqs,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/faqs (Super Admin only)
exports.createFaq = async (req, res) => {
  try {
    const { question, answer, category, displayOrder, isPublished } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ success: false, message: 'Question and answer are required' });
    }

    const newFaq = await Faq.create({
      question: question.trim(),
      answer: answer.trim(),
      category: category ? category.toUpperCase() : 'GENERAL',
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
      isPublished: isPublished !== undefined ? isPublished : true,
    });

    return res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: newFaq,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/faqs/:id (Super Admin only)
exports.updateFaq = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category, displayOrder, isPublished } = req.body;

    const faq = await Faq.findById(id);
    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    if (question !== undefined) faq.question = question.trim();
    if (answer !== undefined) faq.answer = answer.trim();
    if (category !== undefined) faq.category = category.toUpperCase();
    if (displayOrder !== undefined) faq.displayOrder = Number(displayOrder);
    if (isPublished !== undefined) faq.isPublished = isPublished;

    await faq.save();

    return res.status(200).json({
      success: true,
      message: 'FAQ updated successfully',
      data: faq,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/faqs/:id (Super Admin only)
exports.deleteFaq = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await Faq.findByIdAndDelete(id);

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'FAQ deleted successfully',
      data: faq,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/faqs/:id/vote (Public / Customer)
exports.voteFaq = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'helpful' | 'unhelpful'

    if (!['helpful', 'unhelpful'].includes(type)) {
      return res.status(400).json({ success: false, message: "Vote type must be 'helpful' or 'unhelpful'" });
    }

    const incField = type === 'helpful' ? { helpfulCount: 1 } : { unhelpfulCount: 1 };
    const faq = await Faq.findByIdAndUpdate(id, { $inc: incField }, { new: true });

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Thanks for your feedback!`,
      data: {
        id: faq._id,
        helpfulCount: faq.helpfulCount,
        unhelpfulCount: faq.unhelpfulCount,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
