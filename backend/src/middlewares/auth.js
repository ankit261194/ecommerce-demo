const jwt = require('jsonwebtoken');
const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');

// Protect routes: verify JWT with resilient demo fallback
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please provide a valid token.',
    });
  }

  // Support demo persona tokens for instant UI preview & test runner compatibility (disabled in strict production)
  const allowDemoTokens = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_TOKENS === 'true';
  if (allowDemoTokens && (token.startsWith('mock_jwt_') || token.startsWith('demo_'))) {
    let query = { role: 'customer' };
    if (token.includes('superadmin') || token.includes('admin')) {
      query = { $or: [{ role: 'superadmin' }, { email: 'admin@auramarket.com' }] };
    } else if (token.includes('vendor')) {
      query = { $or: [{ email: 'apex@auramarket.com' }, { role: 'vendor' }] };
    } else if (token.includes('delivery') || token.includes('rider')) {
      query = { $or: [{ email: 'rider@auramarket.com' }, { role: 'delivery' }] };
    } else {
      query = { $or: [{ email: 'customer@auramarket.com' }, { role: 'customer' }] };
    }

    try {
      const user = await User.findOne(query);
      if (user && user.isActive) {
        req.user = user;
        if (user.role === 'vendor') {
          req.vendorProfile = await VendorProfile.findOne({ user: user._id });
        }
        return next();
      }
    } catch (err) {
      // Fall through to standard JWT verification
    }
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'production_grade_super_secret_jwt_key_2026_obsidian_amber'
    );
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists or is deactivated.',
      });
    }

    req.user = user;

    // If user is a vendor, attach their vendor profile for easy access
    if (user.role === 'vendor') {
      const vendorProfile = await VendorProfile.findOne({ user: user._id });
      req.vendorProfile = vendorProfile;
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token verification failed or expired.',
      error: error.message,
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user?.role || 'anonymous'}' is not authorized to access this resource.`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
