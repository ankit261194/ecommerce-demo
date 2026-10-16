const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const {
  generateWithGeminiOrFallback,
  generateProductCopy,
  resolveHsnDetails,
  HSN_DATABASE,
} = require('../utils/aiProductGenerator');

// @desc    Generate Complete AI Smart Product Listing & SEO Description
// @route   POST /api/ai-product/generate
// @access  Private (Admin / Vendor)
exports.generateSmartListing = async (req, res, next) => {
  try {
    const {
      title,
      prompt,
      category = 'Electronics',
      subCategory = '',
      tone = 'persuasive',
      targetAudience = 'Modern Consumers',
      language = 'en',
      brand = 'AuraMarket Verified',
    } = req.body;

    if (!title && !prompt) {
      return res.status(400).json({
        success: false,
        message: 'Product title or raw features prompt is required to generate smart listing.',
      });
    }

    const listing = await generateWithGeminiOrFallback({
      title,
      prompt,
      category,
      subCategory,
      tone,
      targetAudience,
      language,
      brand,
    });

    res.status(200).json({
      success: true,
      message: 'AI Smart Product Listing & SEO Copy generated successfully!',
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Optimize & Enhance Existing Product with AI Copy & SEO
// @route   POST /api/ai-product/optimize-existing/:productId
// @access  Private (Admin / Vendor)
exports.optimizeExistingProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const {
      tone = 'persuasive',
      targetAudience = 'Modern Consumers',
      language = 'en',
      applyToDatabase = false,
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Role check: Vendors can only optimize their own products
    if (req.user.role === 'vendor' && product.vendor?.toString() !== req.user.vendorId?.toString()) {
      return res.status(403).json({ success: false, message: 'You can only optimize your own store products.' });
    }

    const generated = await generateWithGeminiOrFallback({
      title: product.title,
      category: product.categoryLabel || product.category || 'General',
      tone,
      targetAudience,
      language,
      brand: product.brand || 'Verified Brand',
    });

    if (applyToDatabase) {
      product.description = generated.detailedDescription;
      if (generated.seoMeta) {
        product.seoTitle = generated.seoMeta.metaTitle;
        product.seoDescription = generated.seoMeta.metaDescription;
      }
      if (generated.suggestedHsnCode && !product.hsnCode) {
        product.hsnCode = generated.suggestedHsnCode;
      }
      await product.save();

      await AuditLog.create({
        action: 'PRODUCT_AI_OPTIMIZED',
        performedBy: req.user._id,
        targetType: 'Product',
        targetId: product._id.toString(),
        details: {
          productTitle: product.title,
          toneUsed: tone,
          appliedFields: ['description', 'seoTitle', 'seoDescription'],
        },
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: applyToDatabase
        ? `Product "${product.title}" updated and optimized in database with AI smart listing!`
        : `AI Smart Listing generated for "${product.title}" (Ready to review).`,
      data: {
        product: {
          _id: product._id,
          title: product.title,
          currentDescription: product.description,
        },
        aiGenerated: generated,
        appliedToDatabase: Boolean(applyToDatabase),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Suggest HSN Code and GST Tax Slab
// @route   POST /api/ai-product/suggest-hsn
// @access  Private (Admin / Vendor)
exports.suggestHsnCode = async (req, res, next) => {
  try {
    const { title = '', category = '', prompt = '' } = req.body;
    const hsn = resolveHsnDetails(category, `${title} ${prompt}`);

    res.status(200).json({
      success: true,
      data: {
        hsnCode: hsn.code,
        gstRatePercent: hsn.rate,
        description: hsn.desc,
        categoryQueried: category || 'General',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Available Tones, Audiences & Benchmark Presets
// @route   GET /api/ai-product/presets
// @access  Public / Private
exports.getListingPresets = async (req, res) => {
  const tones = [
    { id: 'persuasive', name: 'Persuasive (High Conversion)', desc: 'Direct, benefit-focused and action-oriented.' },
    { id: 'luxury', name: 'Luxury & Artisan', desc: 'Prestige, timeless craftsmanship and refined vocabulary.' },
    { id: 'technical', name: 'Technical & Engineering', desc: 'Hardware architecture, metrics and structural precision.' },
    { id: 'minimalist', name: 'Minimalist & Modern', desc: 'Clean, understated, uncluttered and essentialist.' },
    { id: 'playful', name: 'Playful & Energetic', desc: 'Fun, upbeat, vibrant emojis and casual excitement.' },
  ];

  const targetAudiences = [
    'General E-Commerce Shoppers',
    'Tech Enthusiasts & Gamers',
    'Working Professionals & Corporate',
    'Fitness Lovers & Athletes',
    'Gen-Z & Trendy Youth',
    'Home Makers & Families',
    'Budget & Value Seekers',
  ];

  const languages = [
    { code: 'en', name: 'English (Global Standard)' },
    { code: 'hi', name: 'Hinglish / Indian Hindi (Festive & Conversion)' },
  ];

  const sampleBenchmarkPrompts = [
    {
      title: 'AuraSound Apex Wireless ANC Headphones',
      category: 'Electronics',
      subCategory: 'Audio & Headphones',
      tone: 'technical',
      targetAudience: 'Tech Enthusiasts & Gamers',
      notes: '40mm titanium drivers, 40-hour battery, active noise cancellation, fast type-c charging, multipoint Bluetooth 5.4',
    },
    {
      title: 'Obsidian Heavyweight French Terry Hoodie',
      category: 'Fashion',
      subCategory: 'Streetwear & Hoodies',
      tone: 'luxury',
      targetAudience: 'Gen-Z & Trendy Youth',
      notes: '450 GSM organic cotton, boxy drop shoulder cut, brushed fleece interior, double-layered hood',
    },
    {
      title: 'Titanium Edge S9 Ultra AMOLED Smartwatch',
      category: 'Watches',
      subCategory: 'Smartwatches & Wearables',
      tone: 'minimalist',
      targetAudience: 'Working Professionals & Corporate',
      notes: '1.96-inch always-on display, sapphire crystal glass, ECG sensor, GPS route tracking, 7-day battery life',
    },
    {
      title: 'Artisan Ceramic Pour-Over Coffee Dripper & Mug Set',
      category: 'Home & Kitchen',
      subCategory: 'Tableware & Coffee Essentials',
      tone: 'playful',
      targetAudience: 'Home Makers & Families',
      notes: 'Matte glaze ceramic, ribbed heat-retention walls, 400ml matching mug, natural cork heat pad',
    },
  ];

  res.status(200).json({
    success: true,
    data: {
      tones,
      targetAudiences,
      languages,
      sampleBenchmarkPrompts,
      benchmarks: sampleBenchmarkPrompts,
      supportedHsnCategories: Object.keys(HSN_DATABASE),
    },
  });
};
