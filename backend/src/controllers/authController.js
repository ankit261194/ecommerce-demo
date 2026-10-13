const jwt = require('jsonwebtoken');
const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');

// Helper to generate JWT
const generateToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'production_grade_super_secret_jwt_key_2026_obsidian_amber', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Register a new user (Customer, Vendor, Delivery)
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, storeName, gstNumber } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const assignedRole = role && ['vendor', 'delivery'].includes(role) ? role : 'customer';

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: assignedRole,
    });

    let vendorProfile = null;
    if (assignedRole === 'vendor') {
      const slug = (storeName || `${name}'s Store`).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);
      vendorProfile = await VendorProfile.create({
        user: user._id,
        storeName: storeName || `${name} Store`,
        storeSlug: slug,
        gstNumber: gstNumber || '',
        status: 'pending', // Requires admin approval
      });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      vendorProfile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login User
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const normalizedEmail = (email || '').toLowerCase().trim();
    const lookupEmail = normalizedEmail === 'courier@express.com' ? 'rider@auramarket.com' : normalizedEmail;
    const user = await User.findOne({ email: lookupEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated. Please contact support.' });
    }

    let vendorProfile = null;
    if (user.role === 'vendor') {
      vendorProfile = await VendorProfile.findOne({ user: user._id });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      vendorProfile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Current Logged in User
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let vendorProfile = null;
    if (user.role === 'vendor') {
      vendorProfile = await VendorProfile.findOne({ user: user._id });
    }

    res.status(200).json({
      success: true,
      user,
      vendorProfile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile & address
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, addresses } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (addresses) user.addresses = addresses;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Point #24: Multi-Address Book Management (Home, Work, Other)
// @route   GET /api/auth/addresses
exports.getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    res.status(200).json({
      success: true,
      count: user.addresses.length,
      data: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/addresses
exports.addAddress = async (req, res, next) => {
  try {
    const { recipientName, phone, alternatePhone, street, landmark, city, state, pincode, type = 'HOME', isDefault = false } = req.body;

    if (!recipientName || !phone || !street || !city || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Recipient name, phone, street, city, and pincode are required',
      });
    }

    const user = await User.findById(req.user._id);

    // If first address, automatically make it default
    const shouldBeDefault = isDefault || user.addresses.length === 0;

    if (shouldBeDefault) {
      user.addresses.forEach(a => { a.isDefault = false; });
    }

    const newAddress = {
      recipientName,
      phone,
      alternatePhone: alternatePhone || '',
      street,
      landmark: landmark || '',
      city,
      state: state || 'Delhi',
      pincode,
      type: ['HOME', 'WORK', 'OTHER'].includes(type) ? type : 'HOME',
      isDefault: shouldBeDefault,
    };

    user.addresses.push(newAddress);
    await user.save();

    const created = user.addresses[user.addresses.length - 1];

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: created,
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/auth/addresses/:id
exports.updateAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    const { recipientName, phone, alternatePhone, street, landmark, city, state, pincode, type, isDefault } = req.body;

    if (recipientName) address.recipientName = recipientName;
    if (phone) address.phone = phone;
    if (alternatePhone !== undefined) address.alternatePhone = alternatePhone;
    if (street) address.street = street;
    if (landmark !== undefined) address.landmark = landmark;
    if (city) address.city = city;
    if (state) address.state = state;
    if (pincode) address.pincode = pincode;
    if (type && ['HOME', 'WORK', 'OTHER'].includes(type)) address.type = type;

    if (isDefault) {
      user.addresses.forEach(a => { a.isDefault = false; });
      address.isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: address,
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/auth/addresses/:id
exports.deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    const wasDefault = address.isDefault;
    user.addresses.pull({ _id: req.params.id });

    // If deleted address was default and remaining addresses exist, set first as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address removed successfully',
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/auth/addresses/:id/default
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    user.addresses.forEach(a => { a.isDefault = false; });
    address.isDefault = true;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Default address updated successfully',
      defaultAddress: address,
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};
