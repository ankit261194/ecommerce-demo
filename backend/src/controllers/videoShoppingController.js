const ShoppableReel = require('../models/ShoppableReel');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');

// Default initial reels to seed if database is empty
const defaultSeedReels = [
  {
    title: '🎧 Studio Acoustics: Aura Pro ANC In-Depth Look',
    description: 'Experience deep sub-bass, crystal-clear mids, and 40dB hybrid active noise cancellation.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-listening-to-music-with-headphones-40994-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
    status: 'ACTIVE',
    likesCount: 1420,
    viewsCount: 18500,
    commentsCount: 38,
    isLive: false,
    comments: [
      { userName: 'Aarav Mehta', text: 'Does it support multi-device Bluetooth 5.3 pairing?', createdAt: new Date() },
      { userName: 'Neha Sharma', text: 'The bass is truly unbelievable! Ordered mine yesterday.', createdAt: new Date() }
    ]
  },
  {
    title: '⌚ Titanium Rugged Smartwatch Water Resistance Test',
    description: 'Survives 50m submersion, dust storms, and extreme temperatures with 14-day battery life.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-man-adjusting-a-watch-41122-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
    status: 'ACTIVE',
    likesCount: 2310,
    viewsCount: 34200,
    commentsCount: 64,
    isLive: false,
    comments: [
      { userName: 'Vikram Singh', text: 'Is the ECG cardiac sensor ICMR validated?', createdAt: new Date() }
    ]
  },
  {
    title: '👗 Festive Silk Saree Drape & Gold Zari Weave Showcase',
    description: 'Pure Chanderi silk with handwoven temple borders and festive antique zari detailing.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-modeling-a-dress-41006-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
    status: 'ACTIVE',
    likesCount: 3890,
    viewsCount: 42100,
    commentsCount: 92,
    isLive: true,
    liveViewerCount: 184,
    comments: [
      { userName: 'Pooja Kapoor', text: 'Stunning shade of royal maroon! Is express shipping available?', createdAt: new Date() }
    ]
  }
];

// Helper to seed demo reels if none exist
const seedInitialReelsIfEmpty = async () => {
  const count = await ShoppableReel.countDocuments();
  if (count > 0) return;

  const anyProducts = await Product.find().limit(3);
  if (!anyProducts || anyProducts.length === 0) return;

  for (let i = 0; i < defaultSeedReels.length; i++) {
    const seed = defaultSeedReels[i];
    const targetProd = anyProducts[i % anyProducts.length];
    await ShoppableReel.create({
      ...seed,
      vendor: targetProd.vendor || null,
      products: [
        {
          product: targetProd._id,
          tagX: 50,
          tagY: 72,
          customPrice: Math.round(targetProd.sellingPrice * 0.9), // 10% flash discount
          isFeatured: true
        }
      ]
    });
  }
};

/**
 * Public: Get active shoppable reels stream
 * GET /api/video-shopping/reels
 */
exports.getStorefrontReels = async (req, res) => {
  try {
    await seedInitialReelsIfEmpty();

    const reels = await ShoppableReel.find({ status: 'ACTIVE' })
      .populate({
        path: 'products.product',
        select: 'title sellingPrice mrp images brand category stock ratingsAverage'
      })
      .populate('vendor', 'storeName logo')
      .sort({ isLive: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reels.length,
      data: reels
    });
  } catch (error) {
    console.error('getStorefrontReels error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Public: Get single reel details
 * GET /api/video-shopping/reels/:id
 */
exports.getReelById = async (req, res) => {
  try {
    const reel = await ShoppableReel.findById(req.params.id)
      .populate({
        path: 'products.product',
        select: 'title sellingPrice mrp images brand category stock ratingsAverage description'
      })
      .populate('vendor', 'storeName logo rating');

    if (!reel) {
      return res.status(404).json({ success: false, message: 'Shoppable reel not found' });
    }

    res.status(200).json({
      success: true,
      data: reel
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Public: Record reel view
 * POST /api/video-shopping/reels/:id/view
 */
exports.recordReelView = async (req, res) => {
  try {
    const reel = await ShoppableReel.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewsCount: 1 } },
      { new: true }
    ).select('viewsCount');

    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }

    res.status(200).json({
      success: true,
      viewsCount: reel.viewsCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Public: Like a reel
 * POST /api/video-shopping/reels/:id/like
 */
exports.likeReel = async (req, res) => {
  try {
    const reel = await ShoppableReel.findByIdAndUpdate(
      req.params.id,
      { $inc: { likesCount: 1 } },
      { new: true }
    ).select('likesCount');

    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }

    res.status(200).json({
      success: true,
      likesCount: reel.likesCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Public / Customer: Comment on a reel
 * POST /api/video-shopping/reels/:id/comment
 */
exports.commentOnReel = async (req, res) => {
  try {
    const { text, userName } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const newComment = {
      user: req.user ? req.user._id : null,
      userName: req.user ? req.user.name : (userName || 'Valued Shopper'),
      text: text.trim(),
      createdAt: new Date()
    };

    const reel = await ShoppableReel.findByIdAndUpdate(
      req.params.id,
      {
        $push: { comments: newComment },
        $inc: { commentsCount: 1 }
      },
      { new: true }
    );

    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }

    res.status(201).json({
      success: true,
      data: newComment,
      commentsCount: reel.commentsCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin / Vendor: Get all reels & telemetry
 * GET /api/video-shopping/admin/reels
 */
exports.getAdminReels = async (req, res) => {
  try {
    await seedInitialReelsIfEmpty();

    const query = {};
    if (req.user && req.user.role === 'vendor' && req.user.vendorProfile) {
      query.vendor = req.user.vendorProfile;
    }

    const reels = await ShoppableReel.find(query)
      .populate({
        path: 'products.product',
        select: 'title sellingPrice mrp images brand'
      })
      .populate('vendor', 'storeName logo')
      .sort({ createdAt: -1 });

    const totalReels = reels.length;
    const activeReels = reels.filter(r => r.status === 'ACTIVE').length;
    const liveStreamsCount = reels.filter(r => r.isLive).length;
    const totalViews = reels.reduce((acc, r) => acc + (r.viewsCount || 0), 0);
    const totalLikes = reels.reduce((acc, r) => acc + (r.likesCount || 0), 0);
    const totalComments = reels.reduce((acc, r) => acc + (r.commentsCount || 0), 0);

    // Calculated Video Commerce metrics
    const estimatedGmv = Math.round(totalViews * 0.035 * 1250); // 3.5% conversion at ₹1250 avg order
    const clickThroughRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: {
        reels,
        telemetry: {
          totalReels,
          activeReels,
          liveStreamsCount,
          totalViews,
          totalLikes,
          totalComments,
          estimatedGmv,
          clickThroughRate
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin / Vendor: Create new shoppable reel
 * POST /api/video-shopping/admin/reels
 */
exports.createReel = async (req, res) => {
  try {
    const {
      title,
      description,
      videoUrl,
      thumbnailUrl,
      products,
      isLive,
      scheduledAt,
      status
    } = req.body;

    if (!title || !videoUrl) {
      return res.status(400).json({ success: false, message: 'Title and videoUrl are required' });
    }

    let vendorId = req.body.vendor || null;
    if (req.user && req.user.role === 'vendor' && req.user.vendorProfile) {
      vendorId = req.user.vendorProfile;
    }

    // Format products array
    const formattedProducts = Array.isArray(products)
      ? products.map(p => ({
          product: p.product || p.productId || p._id,
          tagX: p.tagX ?? 50,
          tagY: p.tagY ?? 70,
          customPrice: p.customPrice ? Number(p.customPrice) : null,
          isFeatured: p.isFeatured ?? true
        }))
      : [];

    const newReel = await ShoppableReel.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      videoUrl: videoUrl.trim(),
      thumbnailUrl: thumbnailUrl ? thumbnailUrl.trim() : 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600',
      vendor: vendorId,
      products: formattedProducts,
      isLive: Boolean(isLive),
      liveViewerCount: isLive ? 120 : 0,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: status || 'ACTIVE'
    });

    // Populate for immediate response
    await newReel.populate([
      { path: 'products.product', select: 'title sellingPrice mrp images brand' },
      { path: 'vendor', select: 'storeName logo' }
    ]);

    // Audit log
    try {
      await AuditLog.create({
        action: 'REEL_CREATED',
        module: 'MARKETING',
        performedBy: req.user?._id || null,
        userName: req.user?.name || 'Super Admin',
        userEmail: req.user?.email || 'admin@auramarket.com',
        userRole: req.user?.role || 'superadmin',
        targetId: newReel._id.toString(),
        targetType: 'ShoppableReel',
        description: `Created shoppable reel "${newReel.title}"`
      });
    } catch (auditErr) {
      console.warn('AuditLog creation ignored:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Shoppable Reel created successfully',
      data: newReel
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin / Vendor: Update reel
 * PUT /api/video-shopping/admin/reels/:id
 */
exports.updateReel = async (req, res) => {
  try {
    const reel = await ShoppableReel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }

    // Check ownership if vendor
    if (req.user && req.user.role === 'vendor' && req.user.vendorProfile) {
      if (reel.vendor && reel.vendor.toString() !== req.user.vendorProfile.toString()) {
        return res.status(403).json({ success: false, message: 'Cannot edit another vendor reel' });
      }
    }

    const {
      title,
      description,
      videoUrl,
      thumbnailUrl,
      products,
      isLive,
      liveViewerCount,
      scheduledAt,
      status
    } = req.body;

    if (title) reel.title = title.trim();
    if (description !== undefined) reel.description = description.trim();
    if (videoUrl) reel.videoUrl = videoUrl.trim();
    if (thumbnailUrl) reel.thumbnailUrl = thumbnailUrl.trim();
    if (isLive !== undefined) reel.isLive = Boolean(isLive);
    if (liveViewerCount !== undefined) reel.liveViewerCount = Number(liveViewerCount);
    if (scheduledAt !== undefined) reel.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (status) reel.status = status;

    if (Array.isArray(products)) {
      reel.products = products.map(p => ({
        product: p.product || p.productId || p._id,
        tagX: p.tagX ?? 50,
        tagY: p.tagY ?? 70,
        customPrice: p.customPrice ? Number(p.customPrice) : null,
        isFeatured: p.isFeatured ?? true
      }));
    }

    await reel.save();

    await reel.populate([
      { path: 'products.product', select: 'title sellingPrice mrp images brand' },
      { path: 'vendor', select: 'storeName logo' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Shoppable Reel updated successfully',
      data: reel
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin / Vendor: Delete reel
 * DELETE /api/video-shopping/admin/reels/:id
 */
exports.deleteReel = async (req, res) => {
  try {
    const reel = await ShoppableReel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }

    // Check ownership if vendor
    if (req.user && req.user.role === 'vendor' && req.user.vendorProfile) {
      if (reel.vendor && reel.vendor.toString() !== req.user.vendorProfile.toString()) {
        return res.status(403).json({ success: false, message: 'Cannot delete another vendor reel' });
      }
    }

    await ShoppableReel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Shoppable Reel deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
