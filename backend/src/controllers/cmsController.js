const CmsPage = require('../models/CmsPage');

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Seed defaults
const DEFAULT_CMS_PAGES = [
  {
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    category: 'LEGAL',
    metaTitle: 'Privacy Policy | AuraMarket Multi-Vendor Marketplace',
    metaDescription: 'Learn how AuraMarket collects, protects, and handles your personal data under the DPDP Act and GDPR guidelines.',
    isPublished: true,
    contentHtml: `
      <h2>1. Introduction</h2>
      <p>Welcome to <strong>AuraMarket</strong>. We are committed to protecting your privacy and personal data. This Privacy Policy outlines our practices regarding data collection, encryption, and your legal rights under applicable privacy frameworks including the Digital Personal Data Protection Act (DPDP) and GDPR.</p>
      <h2>2. Information We Collect</h2>
      <ul>
        <li><strong>Account Data:</strong> Name, verified email address, phone number, and encrypted password.</li>
        <li><strong>Transaction Data:</strong> Delivery addresses, pincodes, payment gateway transaction IDs, and order logs.</li>
        <li><strong>Device & Analytics:</strong> IP address, browser type, location telemetry (for courier live tracking), and session cookies.</li>
      </ul>
      <h2>3. How We Use Your Information</h2>
      <p>Your information is used strictly to fulfill orders, facilitate multi-vendor commission and split delivery tasks, dispatch real-time SMS/Email order alerts, and provide OTP-verified deliveries.</p>
      <h2>4. Data Security & Storage</h2>
      <p>All sensitive transactions are processed using 256-bit SSL encryption. We never store raw credit card numbers or banking passwords on our servers.</p>
      <h2>5. Contact Us</h2>
      <p>For data inquiries or grievance redressal, contact our Data Protection Officer at <a href="mailto:privacy@auramarket.com">privacy@auramarket.com</a>.</p>
    `,
  },
  {
    title: 'Terms & Conditions',
    slug: 'terms-and-conditions',
    category: 'LEGAL',
    metaTitle: 'Terms & Conditions | AuraMarket',
    metaDescription: 'Read the terms of service governing purchases, merchant listing agreements, and marketplace dispute resolutions.',
    isPublished: true,
    contentHtml: `
      <h2>1. Platform Agreement</h2>
      <p>By accessing or purchasing through <strong>AuraMarket</strong>, you agree to comply with these Terms of Service. AuraMarket operates as a multi-vendor marketplace connecting verified independent merchants with end buyers.</p>
      <h2>2. Multi-Vendor Order Fulfillment</h2>
      <p>Orders containing products from multiple independent merchants are automatically split into vendor-specific sub-orders. Each merchant is responsible for item quality, compliance, and warranty.</p>
      <h2>3. Pricing & Payments</h2>
      <p>All prices displayed are inclusive of applicable GST/VAT. Available payment channels include Razorpay, Stripe, UPI QR, and Cash on Delivery (COD) for serviceable pincodes.</p>
      <h2>4. Delivery OTP Protection</h2>
      <p>All shipments require a 4-digit secret delivery OTP provided to the customer upon dispatch. Riders will only release packages upon successful OTP confirmation.</p>
    `,
  },
  {
    title: 'Refund & Cancellation Policy',
    slug: 'refund-and-cancellation',
    category: 'POLICIES',
    metaTitle: 'Refund, Return & Cancellation Policy | AuraMarket',
    metaDescription: 'Transparent 7-day return, replacement, 1-click exchange, and instant wallet refund timelines.',
    isPublished: true,
    contentHtml: `
      <h2>1. Order Cancellation</h2>
      <p>Customers may cancel orders anytime before the shipment is marked as <strong>SHIPPED</strong> by the vendor. Refunds for prepaid cancellations are issued instantly to your AuraMarket Wallet or in 3-5 business days to the source account.</p>
      <h2>2. 7-Day Hassle-Free Returns & 1-Click Exchange</h2>
      <p>Eligible apparel, footwear, and electronics can be exchanged or returned within 7 days of delivery. For size or color issues, our <strong>1-Click Product Exchange Engine</strong> automatically reserves replacement stock and schedules doorstep reverse pickup.</p>
      <h2>3. Doorstep Reverse Pickup & Inspection</h2>
      <p>During reverse pickup, our delivery partner will verify item tags and inspect packaging. A 4-digit reverse pickup OTP will authenticate the handover.</p>
    `,
  },
  {
    title: 'Shipping & Delivery Policy',
    slug: 'shipping-and-delivery',
    category: 'POLICIES',
    metaTitle: 'Shipping & Delivery Timelines | AuraMarket',
    metaDescription: 'Check delivery SLAs, pincode serviceability tiers, and express courier dispatch guidelines.',
    isPublished: true,
    contentHtml: `
      <h2>1. Delivery Serviceability</h2>
      <p>AuraMarket operates a live Pincode Serviceability Engine. Before placing an order, enter your 6-digit postal code to check standard delivery, express shipping, and COD availability.</p>
      <h2>2. Delivery SLAs & Tiers</h2>
      <ul>
        <li><strong>Metro Cities:</strong> Delivered within 24 to 48 hours.</li>
        <li><strong>Tier 2 & 3 Cities:</strong> Delivered within 2 to 4 business days.</li>
        <li><strong>Remote / Outpost Zones:</strong> Delivered within 5 to 7 business days (Prepaid only).</li>
      </ul>
      <h2>3. Live GPS Order Tracking</h2>
      <p>Once your package is assigned to a courier, monitor real-time rider GPS telemetry and live route progress directly from your Customer Orders Center.</p>
    `,
  },
  {
    title: 'About Us',
    slug: 'about-us',
    category: 'COMPANY',
    metaTitle: 'About AuraMarket | The Next-Gen Multi-Vendor Commerce Platform',
    metaDescription: 'Learn how AuraMarket empowers local and global merchants with cutting-edge technology and transparent logistics.',
    isPublished: true,
    contentHtml: `
      <h2>Welcome to AuraMarket</h2>
      <p>AuraMarket is a hyper-scalable, multi-vendor commerce ecosystem built for modern digital commerce. Founded with the mission to empower local artisans, high-tech brands, and independent merchants, AuraMarket provides a state-of-the-art platform featuring automated split payouts, interactive size guides, real-time courier tracking, and frictionless checkout.</p>
      <h2>Our Core Pillars</h2>
      <ul>
        <li><strong>Transparency:</strong> Double-entry financial ledgers, fair commission structures, and real-time vendor analytics.</li>
        <li><strong>Buyer Trust:</strong> Delivery OTP security, verified merchant KYC, and 1-click product exchanges.</li>
        <li><strong>Speed & Reliability:</strong> Robust Node.js micro-architecture, PWA offline POS billing, and smart route optimization.</li>
      </ul>
    `,
  },
];

// Seed Helper
exports.seedDefaultCmsPages = async () => {
  for (const page of DEFAULT_CMS_PAGES) {
    const existing = await CmsPage.findOne({ slug: page.slug });
    if (!existing) {
      await CmsPage.create(page);
    }
  }
};

// GET /api/cms/pages
exports.getAllPages = async (req, res) => {
  try {
    const { category, published } = req.query;
    const query = {};

    const isAdmin = req.user && (req.user.role === 'superadmin' || req.user.role === 'SUPER_ADMIN');

    if (category) {
      query.category = category.toUpperCase();
    }

    if (!isAdmin) {
      query.isPublished = true;
    } else if (published !== undefined) {
      query.isPublished = published === 'true';
    }

    const pages = await CmsPage.find(query).sort({ category: 1, title: 1 });
    return res.status(200).json({
      success: true,
      count: pages.length,
      data: pages,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/cms/pages/:slug
exports.getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await CmsPage.findOne({ slug: slug.toLowerCase() });

    if (!page) {
      return res.status(404).json({ success: false, message: `Page with slug '${slug}' not found` });
    }

    const isAdmin = req.user && (req.user.role === 'superadmin' || req.user.role === 'SUPER_ADMIN');
    if (!page.isPublished && !isAdmin) {
      return res.status(404).json({ success: false, message: `Page with slug '${slug}' is currently unpublished` });
    }

    return res.status(200).json({
      success: true,
      data: page,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/cms/pages (Admin only)
exports.createPage = async (req, res) => {
  try {
    const { title, slug: customSlug, category, contentHtml, metaTitle, metaDescription, isPublished } = req.body;

    if (!title || !contentHtml) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const slug = customSlug ? slugify(customSlug) : slugify(title);

    const existing = await CmsPage.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, message: `A page with slug '${slug}' already exists` });
    }

    const newPage = await CmsPage.create({
      title,
      slug,
      category: category || 'LEGAL',
      contentHtml,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || '',
      isPublished: isPublished !== undefined ? isPublished : true,
      lastUpdatedBy: req.user?._id || null,
      version: 1,
    });

    return res.status(201).json({
      success: true,
      message: 'CMS page created successfully',
      data: newPage,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/cms/pages/:slug (Admin only)
exports.updatePage = async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, category, contentHtml, metaTitle, metaDescription, isPublished } = req.body;

    const page = await CmsPage.findOne({ slug: slug.toLowerCase() });
    if (!page) {
      return res.status(404).json({ success: false, message: `Page with slug '${slug}' not found` });
    }

    if (title !== undefined) page.title = title;
    if (category !== undefined) page.category = category;
    if (contentHtml !== undefined) page.contentHtml = contentHtml;
    if (metaTitle !== undefined) page.metaTitle = metaTitle;
    if (metaDescription !== undefined) page.metaDescription = metaDescription;
    if (isPublished !== undefined) page.isPublished = isPublished;

    page.version = (page.version || 1) + 1;
    page.lastUpdatedBy = req.user?._id || page.lastUpdatedBy;

    await page.save();

    return res.status(200).json({
      success: true,
      message: 'CMS page updated successfully',
      data: page,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/cms/pages/:slug (Admin only)
exports.deletePage = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await CmsPage.findOneAndDelete({ slug: slug.toLowerCase() });

    if (!page) {
      return res.status(404).json({ success: false, message: `Page with slug '${slug}' not found` });
    }

    return res.status(200).json({
      success: true,
      message: `Page '${page.title}' deleted successfully`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
