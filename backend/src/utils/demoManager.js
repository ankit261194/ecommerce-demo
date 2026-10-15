const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const SubOrder = require('../models/SubOrder');
const DeliveryTask = require('../models/DeliveryTask');
const Ledger = require('../models/Ledger');
const UIConfig = require('../models/UIConfig');
const Coupon = require('../models/Coupon');
const Banner = require('../models/Banner');
const AuditLog = require('../models/AuditLog');

const seedDemoData = async () => {
  console.log('[DemoManager] Seeding demo multi-vendor data...');

  // 1. Ensure SuperAdmin exists
  let admin = await User.findOne({ email: 'admin@auramarket.com' });
  if (!admin) {
    admin = await User.create({
      name: 'Super Admin',
      email: 'admin@auramarket.com',
      phone: '9876543210',
      password: 'admin123456',
      role: 'superadmin',
      staffRoleTitle: 'Chief Executive Officer',
      department: 'Executive',
      permissions: ['all'],
    });
  } else {
    admin.staffRoleTitle = admin.staffRoleTitle || 'Chief Executive Officer';
    admin.department = admin.department || 'Executive';
    admin.permissions = ['all'];
    await admin.save();
  }

  // 1b. Ensure Demo Sub-Admin Staff exist (Point #49)
  let staff1 = await User.findOne({ email: 'operations.lead@auramarket.com' });
  if (!staff1) {
    await User.create({
      name: 'Rohan Deshmukh',
      email: 'operations.lead@auramarket.com',
      phone: '9876543220',
      password: 'staff123456',
      role: 'subadmin',
      staffRoleTitle: 'Logistics & Dispatch Supervisor',
      department: 'Operations',
      permissions: ['orders:read', 'orders:write', 'customers:read'],
      isActive: true,
      status: 'ACTIVE',
    });
  }

  let staff2 = await User.findOne({ email: 'finance.lead@auramarket.com' });
  if (!staff2) {
    await User.create({
      name: 'Simran Walia',
      email: 'finance.lead@auramarket.com',
      phone: '9876543221',
      password: 'staff123456',
      role: 'subadmin',
      staffRoleTitle: 'Accounts & Payouts Specialist',
      department: 'Finance',
      permissions: ['payouts:read', 'payouts:write', 'vendors:read', 'orders:read'],
      isActive: true,
      status: 'ACTIVE',
    });
  }

  // 2. Ensure Vendor Users & Profiles exist
  let vendor1User = await User.findOne({ email: 'apex@auramarket.com' });
  if (!vendor1User) {
    vendor1User = await User.create({
      name: 'Rajesh Verma (Apex Electronics)',
      email: 'apex@auramarket.com',
      phone: '9876543211',
      password: 'vendor123456',
      role: 'vendor',
    });
  }

  let vendor1Profile = await VendorProfile.findOne({ user: vendor1User._id });
  if (!vendor1Profile) {
    vendor1Profile = await VendorProfile.create({
      user: vendor1User._id,
      storeName: 'Apex Tech Hub',
      storeSlug: 'apex-tech-hub',
      description: 'Authorized retailer for high-end audio, gaming gear, and smartphones.',
      gstNumber: '07AAAAA0000A1Z5',
      commissionRate: 8,
      status: 'approved',
      walletBalance: 24500,
      totalSales: 185000,
      rating: 4.9,
    });
  }

  let vendor2User = await User.findOne({ email: 'vogue@auramarket.com' });
  if (!vendor2User) {
    vendor2User = await User.create({
      name: 'Pooja Kapoor (Vogue Trends)',
      email: 'vogue@auramarket.com',
      phone: '9876543212',
      password: 'vendor123456',
      role: 'vendor',
    });
  }

  let vendor2Profile = await VendorProfile.findOne({ user: vendor2User._id });
  if (!vendor2Profile) {
    vendor2Profile = await VendorProfile.create({
      user: vendor2User._id,
      storeName: 'Vogue Trends Apparel',
      storeSlug: 'vogue-trends-apparel',
      description: 'Contemporary streetwear and luxury apparel handcrafted in India.',
      gstNumber: '08BBBBB1111B2Z6',
      commissionRate: 12,
      status: 'approved',
      walletBalance: 12400,
      totalSales: 89000,
      rating: 4.8,
    });
  }

  // 3. Ensure Delivery Partner exists
  let rider = await User.findOne({ email: 'rider@auramarket.com' });
  if (!rider) {
    rider = await User.create({
      name: 'Vikram Singh (Express Courier)',
      email: 'rider@auramarket.com',
      phone: '9876543213',
      password: 'rider123456',
      role: 'delivery',
    });
  }

  // 4. Ensure Customer exists
  let customer = await User.findOne({ email: 'customer@auramarket.com' });
  if (!customer) {
    customer = await User.create({
      name: 'Aman Sharma',
      email: 'customer@auramarket.com',
      phone: '9876543214',
      password: 'customer123456',
      role: 'customer',
      addresses: [
        {
          recipientName: 'Aman Sharma',
          phone: '9876543214',
          street: 'Flat 402, Green Valley Apartments',
          landmark: 'Near Central Park',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          type: 'HOME',
          isDefault: true,
        },
      ],
    });
  }

  // 5. Seed Root Categories & Subcategories (Point #4)
  const rootCategoriesData = [
    { name: 'Electronics & Audio', slug: 'electronics-audio', icon: 'headphones', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', isFeatured: true, displayOrder: 1 },
    { name: 'Men & Women Fashion', slug: 'fashion', icon: 'shirt', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500', isFeatured: true, displayOrder: 2 },
    { name: 'Home & Kitchen', slug: 'home-kitchen', icon: 'home', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500', isFeatured: true, displayOrder: 3 },
    { name: 'Watches & Accessories', slug: 'watches-accessories', icon: 'watch', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500', isFeatured: true, displayOrder: 4 },
  ];

  const categoryMap = {};
  for (const cat of rootCategoriesData) {
    let existing = await Category.findOne({ slug: cat.slug });
    if (!existing) {
      existing = await Category.create(cat);
    } else {
      await Category.findByIdAndUpdate(existing._id, { $set: { ...cat, parentCategory: null } });
    }
    categoryMap[cat.slug] = existing._id;
  }

  // Nested Subcategories
  const subCategoriesData = [
    { name: 'Wireless Headphones', slug: 'wireless-headphones', icon: 'headphones', parentSlug: 'electronics-audio', displayOrder: 1 },
    { name: 'Smartwatches & Wearables', slug: 'smartwatches-wearables', icon: 'watch', parentSlug: 'electronics-audio', displayOrder: 2 },
    { name: 'Bluetooth Speakers', slug: 'bluetooth-speakers', icon: 'speaker', parentSlug: 'electronics-audio', displayOrder: 3 },

    { name: 'Streetwear & Hoodies', slug: 'streetwear-hoodies', icon: 'shirt', parentSlug: 'fashion', displayOrder: 1 },
    { name: 'Tailored Blazers', slug: 'blazers-formal', icon: 'briefcase', parentSlug: 'fashion', displayOrder: 2 },
    { name: 'Footwear & Sneakers', slug: 'footwear-sneakers', icon: 'shoe', parentSlug: 'fashion', displayOrder: 3 },

    { name: 'Smart Lighting', slug: 'smart-lighting', icon: 'lamp', parentSlug: 'home-kitchen', displayOrder: 1 },
    { name: 'Kitchen & Dining', slug: 'cookware-appliances', icon: 'coffee', parentSlug: 'home-kitchen', displayOrder: 2 },

    { name: 'Luxury Chronographs', slug: 'luxury-chronographs', icon: 'watch', parentSlug: 'watches-accessories', displayOrder: 1 },
    { name: 'Leather Straps & Wallets', slug: 'leather-wallets', icon: 'pocket', parentSlug: 'watches-accessories', displayOrder: 2 },
  ];

  const subCategoryMap = {};
  for (const sub of subCategoriesData) {
    let existing = await Category.findOne({ slug: sub.slug });
    const parentId = categoryMap[sub.parentSlug];
    const subPayload = {
      name: sub.name,
      slug: sub.slug,
      icon: sub.icon,
      parentCategory: parentId,
      displayOrder: sub.displayOrder,
    };
    if (!existing) {
      existing = await Category.create(subPayload);
    } else {
      await Category.findByIdAndUpdate(existing._id, { $set: subPayload });
    }
    subCategoryMap[sub.slug] = existing._id;
  }

  // 6. Seed Realistic Products with Hierarchy References
  const productsData = [
    {
      vendor: vendor1Profile._id,
      title: 'Aura Pro ANC Wireless Noise-Cancelling Headphones',
      slug: 'aura-pro-anc-wireless-headphones',
      description: 'Studio-grade spatial acoustics with 40-hour battery life and custom titanium drivers.',
      category: categoryMap['electronics-audio'],
      subCategory: subCategoryMap['wireless-headphones'],
      brand: 'AuraAudio',
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800',
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800',
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800',
      ],
      mrp: 14999,
      sellingPrice: 8999,
      stock: 45,
      sku: 'APX-HEAD-001',
      hasVariants: true,
      variants: [
        { sku: 'APX-HEAD-BLK', name: 'Obsidian Black', attributes: { color: 'Black' }, additionalPrice: 0, stock: 25 },
        { sku: 'APX-HEAD-SLV', name: 'Silver Matte', attributes: { color: 'Silver' }, additionalPrice: 500, stock: 20 },
      ],
      specifications: [
        { key: 'Driver Unit', value: '40mm Custom Titanium Drivers' },
        { key: 'Noise Cancellation', value: 'Hybrid Active Noise Cancellation (-38dB)' },
        { key: 'Battery Life', value: '40 Hours (ANC On) / 55 Hours (ANC Off)' },
        { key: 'Charging', value: 'USB Type-C Fast Charge (10 min = 5 hours playback)' },
        { key: 'Bluetooth Version', value: 'Bluetooth 5.3 with Multipoint Connect' },
        { key: 'Microphones', value: 'Quad-mic array with AI ENC voice isolation' },
        { key: 'Weight', value: '248 grams' },
        { key: 'Warranty', value: '1 Year Brand Replacement Warranty' },
      ],
      ratingsAverage: 4.8,
      ratingsQuantity: 42,
      isFeatured: true,
      tags: ['audio', 'wireless', 'headphones', 'anc'],
    },
    {
      vendor: vendor1Profile._id,
      title: 'AeroWatch S9 Ultra Smartwatch with AMOLED Display',
      slug: 'aerowatch-s9-ultra-smartwatch',
      description: 'Titanium chassis, ECG heart tracking, GPS routing, and IP68 waterproof rating.',
      category: categoryMap['watches-accessories'],
      subCategory: subCategoryMap['smartwatches-wearables'],
      brand: 'AeroTech',
      images: [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
        'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800',
        'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800',
      ],
      mrp: 9999,
      sellingPrice: 4499,
      stock: 30,
      sku: 'APX-WTCH-002',
      hasVariants: false,
      specifications: [
        { key: 'Display', value: '2.02 inch Ultra AMOLED (500 nits peak brightness)' },
        { key: 'Chassis Material', value: 'Aerospace Grade Titanium Case' },
        { key: 'Sensors', value: 'Optical Heart Rate, SpO2, ECG, Pedometer' },
        { key: 'Water Resistance', value: 'IP68 & 5ATM Water Resistant (Up to 50m)' },
        { key: 'Battery Life', value: '420mAh Lithium-Polymer (Up to 7 Days typical use)' },
        { key: 'Compatibility', value: 'Android 8.0+ & iOS 12.0+' },
        { key: 'Warranty', value: '1 Year Manufacturer Warranty' },
      ],
      ratingsAverage: 4.7,
      ratingsQuantity: 38,
      isFeatured: true,
      tags: ['smartwatch', 'fitness', 'amoled'],
    },
    {
      vendor: vendor2Profile._id,
      title: 'Obsidian Oversized Heavyweight Cotton Hoodie',
      slug: 'obsidian-oversized-heavyweight-hoodie',
      description: '450 GSM French terry cotton with tailored dropped shoulders and ribbed accents.',
      category: categoryMap['fashion'],
      subCategory: subCategoryMap['streetwear-hoodies'],
      brand: 'Vogue Urban',
      images: [
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800',
        'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800',
        'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800',
      ],
      mrp: 3999,
      sellingPrice: 1999,
      stock: 60,
      sku: 'VOG-HOD-001',
      hasVariants: true,
      variants: [
        { sku: 'VOG-HOD-M', name: 'Medium / Obsidian', attributes: { size: 'M', color: 'Obsidian' }, additionalPrice: 0, stock: 20 },
        { sku: 'VOG-HOD-L', name: 'Large / Obsidian', attributes: { size: 'L', color: 'Obsidian' }, additionalPrice: 0, stock: 25 },
        { sku: 'VOG-HOD-XL', name: 'XL / Obsidian', attributes: { size: 'XL', color: 'Obsidian' }, additionalPrice: 100, stock: 15 },
      ],
      specifications: [
        { key: 'Fabric Composition', value: '100% Combed French Terry Cotton (450 GSM)' },
        { key: 'Fit Type', value: 'Oversized Streetwear Drop-Shoulder Silhouette' },
        { key: 'Wash Care', value: 'Machine Wash Cold Inside-Out, Do Not Bleach' },
        { key: 'Pockets', value: 'Kangaroo Front Pocket with Reinforced Double-Stitch' },
        { key: 'Country of Origin', value: 'India' },
      ],
      ratingsAverage: 4.9,
      ratingsQuantity: 84,
      isFeatured: true,
      tags: ['hoodie', 'streetwear', 'cotton', 'winter'],
    },
    {
      vendor: vendor2Profile._id,
      title: 'Tailored Linen Minimalist Casual Blazer',
      slug: 'tailored-linen-minimalist-blazer',
      description: 'Breathable pure European linen engineered for lightweight summer styling.',
      category: categoryMap['fashion'],
      subCategory: subCategoryMap['blazers-formal'],
      brand: 'Vogue Luxe',
      images: [
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800',
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800',
      ],
      mrp: 7999,
      sellingPrice: 4299,
      stock: 25,
      sku: 'VOG-BLZ-002',
      hasVariants: false,
      specifications: [
        { key: 'Material', value: '100% Pure European Breathable Linen' },
        { key: 'Lining', value: 'Half-Lined Soft Breathable Viscose' },
        { key: 'Fit', value: 'Slim-Tailored Unstructured Silhouette' },
        { key: 'Buttons', value: 'Natural Horn Buttons with Contrast Thread' },
        { key: 'Care Instructions', value: 'Dry Clean Recommended' },
      ],
      ratingsAverage: 4.6,
      ratingsQuantity: 19,
      isFeatured: false,
      tags: ['blazer', 'linen', 'formal'],
    },
    {
      vendor: vendor1Profile._id,
      title: 'SonicPulse 360 Portable Bluetooth Speaker',
      slug: 'sonicpulse-360-portable-speaker',
      description: '360-degree immersive acoustic sound, IPX7 waterproof rating, and 24-hour playtime.',
      category: categoryMap['electronics-audio'],
      subCategory: subCategoryMap['bluetooth-speakers'],
      brand: 'AuraAudio',
      images: [
        'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800',
        'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800',
      ],
      mrp: 4999,
      sellingPrice: 2499,
      stock: 50,
      sku: 'APX-SPK-003',
      hasVariants: false,
      specifications: [
        { key: 'Audio Output', value: '25W Dual High-Excursion Neodymium Drivers' },
        { key: 'Waterproof', value: 'IPX7 Submersible Waterproof Rating' },
        { key: 'Battery Life', value: '24 Hours Continuous Playback (5200mAh)' },
        { key: 'Bluetooth Version', value: 'Bluetooth 5.3 + TWS Stereo Pairing' },
      ],
      ratingsAverage: 4.8,
      ratingsQuantity: 65,
      isFeatured: true,
      tags: ['speaker', 'bluetooth', 'audio', 'portable'],
    },
    {
      vendor: vendor1Profile._id,
      title: 'Aura Luma Ambient Smart Desk Lamp',
      slug: 'aura-luma-ambient-smart-desk-lamp',
      description: 'Stepless color temperature dimming, wireless phone charging base, and gentle eye-care light.',
      category: categoryMap['home-kitchen'],
      subCategory: subCategoryMap['smart-lighting'],
      brand: 'AuraLiving',
      images: [
        'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',
        'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800',
      ],
      mrp: 5999,
      sellingPrice: 3199,
      stock: 35,
      sku: 'APX-LMP-004',
      hasVariants: false,
      specifications: [
        { key: 'Brightness', value: '800 Lumens RGBCW Color Tuning' },
        { key: 'Wireless Charging', value: '15W Fast Qi Wireless Charging Pad' },
        { key: 'App Control', value: 'WiFi & Bluetooth Smart App Controls' },
        { key: 'Color Temperature', value: '2700K - 6500K Tunable White' },
      ],
      ratingsAverage: 4.7,
      ratingsQuantity: 28,
      isFeatured: false,
      tags: ['lamp', 'smart-home', 'lighting', 'desk'],
    },
  ];

  for (const prod of productsData) {
    const existing = await Product.findOne({ slug: prod.slug });
    if (!existing) {
      await Product.create(prod);
    } else {
      await Product.findByIdAndUpdate(existing._id, { $set: prod });
    }
  }

  // 7. Seed or Update UI Config (Obsidian & Amber)
  let uiConfig = await UIConfig.findOne();
  if (!uiConfig) {
    uiConfig = await UIConfig.create({
      storeName: 'AuraMarket',
      tagline: 'The Next-Gen Multi-Vendor Commerce Platform',
      primaryColor: '#F59E0B',
      secondaryColor: '#0B0F17',
      announcementText: '✨ Launch Offer: Flat ₹500 Cashback on Orders Above ₹2999!',
      showAnnouncement: true,
      heroBanners: [
        {
          title: 'Spatial Audio Reinvented',
          subtitle: 'Immerse yourself in studio-grade acoustics with Aura Pro series.',
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200',
          actionLink: '/products',
          badgeText: 'Featured Deal',
          isActive: true,
        },
        {
          title: 'The Autumn Luxury Collection',
          subtitle: 'Handcrafted heavyweight textures designed for contemporary living.',
          imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
          actionLink: '/products?category=fashion',
          badgeText: 'New Arrivals',
          isActive: true,
        },
      ],
      featuredCategoryIds: Object.values(categoryMap),
      demoModeActive: true,
    });
  }

  // 8. Seed Sample Multi-Vendor Order & Delivery Tasks (if no orders exist)
  const existingOrder = await Order.findOne();
  if (!existingOrder) {
    const p1 = await Product.findOne({ sku: 'APX-HEAD-001' });
    const p2 = await Product.findOne({ sku: 'VOG-HOD-001' });
    if (p1 && p2) {
      const order = await Order.create({
        orderNumber: 'ORD-DEMO-2026',
        customer: customer._id,
        items: [
          {
            product: p1._id,
            vendor: vendor1Profile._id,
            title: p1.title,
            image: p1.images[0],
            quantity: 1,
            price: p1.sellingPrice,
            totalPrice: p1.sellingPrice,
          },
          {
            product: p2._id,
            vendor: vendor2Profile._id,
            title: p2.title,
            image: p2.images[0],
            quantity: 1,
            price: p2.sellingPrice,
            totalPrice: p2.sellingPrice,
          },
        ],
        totalAmount: p1.sellingPrice + p2.sellingPrice,
        totalCommission: Math.round(p1.sellingPrice * 0.08 + p2.sellingPrice * 0.12),
        shippingAddress: customer.addresses[0],
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
      });

      // SubOrder 1 for Apex Tech
      const sub1 = await SubOrder.create({
        parentOrder: order._id,
        vendor: vendor1Profile._id,
        customer: customer._id,
        items: [
          {
            product: p1._id,
            title: p1.title,
            image: p1.images[0],
            quantity: 1,
            price: p1.sellingPrice,
            totalPrice: p1.sellingPrice,
          },
        ],
        subTotal: p1.sellingPrice,
        platformCommissionRate: 8,
        platformCommissionAmount: Math.round(p1.sellingPrice * 0.08),
        vendorEarning: Math.round(p1.sellingPrice * 0.92),
        status: 'out_for_delivery',
        deliveryOtp: '4821',
        deliveryPartner: rider._id,
        shippingAddress: customer.addresses[0],
        trackingHistory: [
          { status: 'placed', timestamp: new Date(Date.now() - 3600000), note: 'Order placed by customer' },
          { status: 'dispatched', timestamp: new Date(Date.now() - 1800000), note: 'Dispatched by Apex Tech Hub' },
          { status: 'out_for_delivery', timestamp: new Date(), note: 'Out for delivery with courier rider Vikram Singh' },
        ],
      });

      // SubOrder 2 for Vogue Trends
      const sub2 = await SubOrder.create({
        parentOrder: order._id,
        vendor: vendor2Profile._id,
        customer: customer._id,
        items: [
          {
            product: p2._id,
            title: p2.title,
            image: p2.images[0],
            quantity: 1,
            price: p2.sellingPrice,
            totalPrice: p2.sellingPrice,
          },
        ],
        subTotal: p2.sellingPrice,
        platformCommissionRate: 12,
        platformCommissionAmount: Math.round(p2.sellingPrice * 0.12),
        vendorEarning: Math.round(p2.sellingPrice * 0.88),
        status: 'confirmed',
        deliveryOtp: '9104',
        deliveryPartner: rider._id,
        shippingAddress: customer.addresses[0],
        trackingHistory: [
          { status: 'placed', timestamp: new Date(Date.now() - 3600000), note: 'Order placed by customer' },
          { status: 'confirmed', timestamp: new Date(), note: 'Accepted by Vogue Trends Apparel' },
        ],
      });

      order.subOrders = [sub1._id, sub2._id];
      await order.save();

      // Delivery Task for SubOrder 1
      await DeliveryTask.create({
        subOrder: sub1._id,
        deliveryPartner: rider._id,
        pickupLocation: {
          storeName: vendor1Profile.storeName,
          phone: '9876543211',
          address: 'Shop 14, Commercial Complex, Sector 18, Noida',
          city: 'Noida',
          pincode: '201301',
        },
        dropLocation: {
          recipientName: customer.addresses[0].recipientName,
          phone: customer.addresses[0].phone,
          address: customer.addresses[0].street,
          city: customer.addresses[0].city,
          pincode: customer.addresses[0].pincode,
          landmark: 'Near City Centre Gate #3',
          coordinates: { lat: 28.5355, lng: 77.3910 },
          mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.addresses[0].street + ', ' + customer.addresses[0].city)}`,
        },
        status: 'OUT_FOR_DELIVERY',
        isCod: true,
        amountToCollect: p1.sellingPrice,
      });

      // Delivery Task for SubOrder 2
      await DeliveryTask.create({
        subOrder: sub2._id,
        deliveryPartner: rider._id,
        pickupLocation: {
          storeName: vendor2Profile.storeName,
          phone: '9876543212',
          address: 'Unit 402, Fashion District, Sector 29, Gurugram',
          city: 'Gurugram',
          pincode: '122002',
        },
        dropLocation: {
          recipientName: customer.addresses[0].recipientName,
          phone: customer.addresses[0].phone,
          address: customer.addresses[0].street,
          city: customer.addresses[0].city,
          pincode: customer.addresses[0].pincode,
          landmark: 'Tower B, 4th Floor',
          coordinates: { lat: 28.4595, lng: 77.0266 },
          mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.addresses[0].street + ', ' + customer.addresses[0].city)}`,
        },
        status: 'PICKED_UP',
        isCod: false,
        amountToCollect: 0,
      });

      // Initial Ledgers
      await Ledger.create({
        vendor: vendor1Profile._id,
        subOrder: sub1._id,
        type: 'ORDER_CREDIT',
        amount: Math.round(p1.sellingPrice * 0.92),
        description: `Demo Credit for SubOrder #${sub1._id.toString().slice(-6)}`,
        balanceAfter: vendor1Profile.walletBalance,
        status: 'COMPLETED',
      });

      await Ledger.create({
        type: 'COMMISSION_DEBIT',
        amount: Math.round(p1.sellingPrice * 0.08 + p2.sellingPrice * 0.12),
        description: `Platform Commission cut on Master Order #ORD-DEMO-2026`,
        balanceAfter: Math.round(p1.sellingPrice * 0.08 + p2.sellingPrice * 0.12),
        status: 'COMPLETED',
      });
    }
  }

  // 10. Seed Demo Promo Codes / Coupons
  const existingCouponsCount = await Coupon.countDocuments();
  if (existingCouponsCount === 0) {
    await Coupon.create([
      {
        code: 'AURAFIRST',
        title: 'Welcome 20% Off',
        description: 'Save 20% up to ₹1,000 on your order above ₹999.',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        maxDiscountAmount: 1000,
        minOrderAmount: 999,
        isFeatured: true,
        isActive: true,
      },
      {
        code: 'FESTIVE500',
        title: 'Flat ₹500 Mega Festive Savings',
        description: 'Get flat ₹500 instant discount on orders above ₹2,499.',
        discountType: 'FLAT',
        discountValue: 500,
        minOrderAmount: 2499,
        isFeatured: true,
        isActive: true,
      },
      {
        code: 'SUPER10',
        title: 'Everyday Saver 10% Off',
        description: 'Enjoy 10% instant discount across all catalog items with no minimum spend.',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        maxDiscountAmount: 500,
        minOrderAmount: 0,
        isFeatured: false,
        isActive: true,
      },
    ]);
  }

  // 11. Seed Demo Hero and Promo Banners
  const existingBannersCount = await Banner.countDocuments();
  if (existingBannersCount === 0) {
    await Banner.create([
      {
        title: 'Next-Gen Wireless Noise Cancelling Over-Ear',
        subtitle: 'Immerse in studio-grade acoustics with 40-hour playtime & dynamic ANC.',
        badgeText: '🔥 Mega Launch 2026',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
        actionLink: '/category/electronics',
        buttonText: 'Shop Electronics',
        position: 'hero_slider',
        displayOrder: 1,
        isActive: true,
        backgroundColor: '#0F172A',
        textColor: '#FFFFFF',
      },
      {
        title: 'Cyberpunk & Minimal Streetwear Drop',
        subtitle: 'Heavyweight organic cotton, boxy oversized cuts, and handcrafted aesthetics.',
        badgeText: '✨ New Arrivals',
        imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80',
        actionLink: '/category/fashion',
        buttonText: 'Explore Fashion',
        position: 'hero_slider',
        displayOrder: 2,
        isActive: true,
        backgroundColor: '#1E1B4B',
        textColor: '#FFFFFF',
      },
      {
        title: 'Titanium Smartwatch Pro Ultra Series',
        subtitle: 'Military-grade rugged durability, multi-day battery, and ECG cardiac sensor.',
        badgeText: '⚡ Limited Flash Deal',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
        actionLink: '/products',
        buttonText: 'Grab Deal Now',
        position: 'hero_slider',
        displayOrder: 3,
        isActive: true,
        backgroundColor: '#18181B',
        textColor: '#FFFFFF',
      },
      {
        title: 'Festive Electronics Bonanza — Flat 40% OFF',
        subtitle: 'Use coupon FESTIVE500 at checkout on orders above ₹2,499.',
        badgeText: '🎉 Festive Special',
        imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
        actionLink: '/products',
        buttonText: 'Claim 40% OFF',
        position: 'promo_banner_top',
        displayOrder: 1,
        isActive: true,
        backgroundColor: '#F59E0B',
        textColor: '#0B0F17',
      },
      {
        title: 'Join As A Verified Merchant Partner Today',
        subtitle: 'Zero upfront listing fee, 24-hour payouts, and 100k+ active shoppers across India.',
        badgeText: '💼 Vendor Onboarding',
        imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67e5572248?auto=format&fit=crop&w=1200&q=80',
        actionLink: '/vendor/register',
        buttonText: 'Open Your Store',
        position: 'promo_banner_middle',
        displayOrder: 1,
        isActive: true,
        backgroundColor: '#047857',
        textColor: '#FFFFFF',
      },
    ]);
  }

  // Ensure initial audit logs exist (Point #50)
  const existingAuditLogs = await AuditLog.countDocuments();
  if (existingAuditLogs === 0) {
    await AuditLog.create([
      {
        action: 'SYSTEM_INITIALIZATION',
        module: 'SYSTEM',
        performedBy: admin._id,
        userName: 'Super Admin',
        userEmail: 'admin@auramarket.com',
        userRole: 'superadmin',
        description: 'AuraMarket Enterprise Multi-Vendor Platform initialized successfully.',
        details: { version: '3.2.0', environment: 'production-ready' },
        status: 'SUCCESS',
      },
      {
        action: 'STAFF_ROLE_ASSIGNED',
        module: 'STAFF',
        performedBy: admin._id,
        userName: 'Super Admin',
        userEmail: 'admin@auramarket.com',
        userRole: 'superadmin',
        targetId: 'operations.lead@auramarket.com',
        targetType: 'User',
        description: 'Assigned "Logistics & Dispatch Supervisor" role to Rohan Deshmukh with granular orders & CRM rights.',
        status: 'SUCCESS',
      },
      {
        action: 'VENDOR_KYC_APPROVED',
        module: 'VENDORS',
        performedBy: admin._id,
        userName: 'Super Admin',
        userEmail: 'admin@auramarket.com',
        userRole: 'superadmin',
        targetId: 'apex-tech-hub',
        targetType: 'VendorProfile',
        description: 'Verified GSTIN and bank details for vendor Apex Tech Hub (8% platform commission).',
        status: 'SUCCESS',
      },
      {
        action: 'SETTINGS_UPDATED',
        module: 'SETTINGS',
        performedBy: admin._id,
        userName: 'Super Admin',
        userEmail: 'admin@auramarket.com',
        userRole: 'superadmin',
        description: 'Configured GST tax engine (18% default) & dynamic shipping rules (₹999 free shipping threshold).',
        status: 'SUCCESS',
      },
    ]);
  }

  console.log('[DemoManager] Seeding completed successfully!');
  return { success: true, message: 'Demo data seeded successfully' };
};

const wipeDemoData = async () => {
  console.log('[DemoManager] Wiping demo products, orders, tasks, ledgers, coupons, and banners...');

  // 1. Delete all products, categories, orders, suborders, delivery tasks, ledger entries, coupons, banners, audit logs
  await Product.deleteMany({});
  await Order.deleteMany({});
  await SubOrder.deleteMany({});
  await DeliveryTask.deleteMany({});
  await Ledger.deleteMany({});
  await Category.deleteMany({});
  await Coupon.deleteMany({});
  await Banner.deleteMany({});
  await AuditLog.deleteMany({});

  // 2. Remove non-admin demo users if desired, or keep superadmin safe
  await User.deleteMany({ role: { $ne: 'superadmin' } });
  await VendorProfile.deleteMany({});

  // 3. Reset UI Config to clean state
  await UIConfig.findOneAndUpdate(
    {},
    {
      demoModeActive: false,
      heroBanners: [],
      featuredCategoryIds: [],
    },
    { new: true, upsert: true }
  );

  console.log('[DemoManager] Database wiped clean! Production ready.');
  return { success: true, message: 'All demo data wiped cleanly. Database is now in fresh production state.' };
};

module.exports = { seedDemoData, wipeDemoData };
