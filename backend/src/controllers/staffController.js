const User = require('../models/User');
const StaffRole = require('../models/StaffRole');
const bcrypt = require('bcryptjs');

const DEFAULT_CATEGORIES = [
  {
    category: 'Orders & Shipments',
    permissions: [
      { key: 'orders:read', label: 'View Orders & Invoices', description: 'Can view customer orders, status, and PDF tax invoices' },
      { key: 'orders:write', label: 'Manage Order Lifecycles', description: 'Can update order statuses, perform bulk fulfillment and export CSV' },
    ],
  },
  {
    category: 'Catalog & Inventory',
    permissions: [
      { key: 'products:read', label: 'View Products & Inventory', description: 'Can browse platform products, stock counts, and variants' },
      { key: 'products:write', label: 'Moderate & Update Products', description: 'Can approve vendor products, modify pricing, edit details' },
      { key: 'categories:write', label: 'Manage Categories & Brands', description: 'Can add, edit, reorder category tree and manufacturer brands' },
    ],
  },
  {
    category: 'Vendors & Store Approval',
    permissions: [
      { key: 'vendors:read', label: 'View Vendor Directory & KYC', description: 'Can view merchant store profiles, documents, and banking details' },
      { key: 'vendors:write', label: 'Approve KYC & Commission Rates', description: 'Can verify KYC, approve/reject merchants, and customize commission fees' },
    ],
  },
  {
    category: 'Finance & Payouts',
    permissions: [
      { key: 'payouts:read', label: 'View Payout Requests & Ledgers', description: 'Can inspect withdrawal requests and financial balance ledgers' },
      { key: 'payouts:write', label: 'Process & Reject Payouts', description: 'Can disburse payouts with bank UTRs and approve/reject transactions' },
    ],
  },
  {
    category: 'Customer CRM',
    permissions: [
      { key: 'customers:read', label: 'View Customer Profiles & LTV', description: 'Can view customer directory, spending histories, and lifetime value' },
      { key: 'customers:write', label: 'Manage Customers & Verification', description: 'Can block, suspend, verify customer badges, and add internal notes' },
    ],
  },
  {
    category: 'Marketing & Promotions',
    permissions: [
      { key: 'marketing:write', label: 'Manage Coupons, Banners & Flash Deals', description: 'Can create promo vouchers, homepage hero banners, and flash campaigns' },
    ],
  },
  {
    category: 'Logistics & Fulfillment',
    permissions: [
      { key: 'logistics:read', label: 'View Pincode Zones & Warehouses', description: 'Can inspect delivery pincodes, courier performance and stock routing' },
      { key: 'logistics:write', label: 'Manage Dispatch Manifests & Zones', description: 'Can configure pincode delivery rules, shipping manifests and transfer orders' },
    ],
  },
  {
    category: 'System & Security',
    permissions: [
      { key: 'settings:read', label: 'View System Settings', description: 'Can view tax rules, shipping fees, SEO, and integration setups' },
      { key: 'settings:write', label: 'Configure System Engines', description: 'Can modify GST rates, shipping zones, third-party APIs, and webmaster tags' },
      { key: 'staff:manage', label: 'Manage Staff Accounts & Roles', description: 'Can create and configure permissions for sub-admin employees' },
    ],
  },
];

const DEFAULT_PRESETS = [
  {
    id: 'order_lead',
    name: 'Order & Dispatch Lead',
    title: 'Logistics Supervisor',
    department: 'Operations',
    permissions: ['orders:read', 'orders:write', 'customers:read', 'logistics:read'],
  },
  {
    id: 'catalog_auditor',
    name: 'Catalog & Brand Auditor',
    title: 'Catalog Specialist',
    department: 'Catalog',
    permissions: ['products:read', 'products:write', 'categories:write'],
  },
  {
    id: 'finance_officer',
    name: 'Finance & Payouts Officer',
    title: 'Accounts Executive',
    department: 'Finance',
    permissions: ['payouts:read', 'payouts:write', 'vendors:read', 'orders:read'],
  },
  {
    id: 'merchant_manager',
    name: 'Merchant Success Associate',
    title: 'Vendor Partner Manager',
    department: 'Operations',
    permissions: ['vendors:read', 'vendors:write', 'products:read'],
  },
  {
    id: 'customer_support',
    name: 'Customer Support Representative',
    title: 'Support Executive',
    department: 'Support',
    permissions: ['customers:read', 'customers:write', 'orders:read'],
  },
  {
    id: 'marketing_lead',
    name: 'Growth & Marketing Lead',
    title: 'Marketing Manager',
    department: 'Marketing',
    permissions: ['marketing:write', 'orders:read', 'products:read'],
  },
];

// Helper to seed standard system roles if table is empty
const seedDefaultRoles = async () => {
  const count = await StaffRole.countDocuments();
  if (count === 0) {
    const rolesToSeed = [
      {
        name: 'Super Administrator',
        code: 'SUPER_ADMIN',
        title: 'Platform Administrator',
        description: 'Complete unrestricted root access across all platform systems and databases.',
        department: 'Executive',
        permissions: ['all'],
        isSystemRole: true,
      },
      ...DEFAULT_PRESETS.map((p) => ({
        name: p.name,
        code: p.id.toUpperCase(),
        title: p.title,
        description: `Pre-configured operational staff role for ${p.department} division.`,
        department: p.department,
        permissions: p.permissions,
        isSystemRole: true,
      })),
    ];
    await StaffRole.insertMany(rolesToSeed);
  }
};

// @desc    Get Permissions Catalog & Pre-configured Role Presets
// @route   GET /api/admin/staff/permissions
// @access  Private (Super Admin / Staff Manager)
exports.getPermissionsCatalog = async (req, res, next) => {
  try {
    await seedDefaultRoles();
    const systemRoles = await StaffRole.find({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        categories: DEFAULT_CATEGORIES,
        presets: systemRoles.map((r) => ({
          id: r.code.toLowerCase(),
          name: r.name,
          title: r.title,
          department: r.department,
          permissions: r.permissions,
          isSystemRole: r.isSystemRole,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get List of All Sub-Admin Staff Members
// @route   GET /api/admin/staff
// @access  Private (Super Admin / Staff Manager)
exports.getStaffMembers = async (req, res, next) => {
  try {
    const staff = await User.find({
      role: { $in: ['superadmin', 'subadmin', 'admin'] },
    })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create New Sub-Admin Staff Member
// @route   POST /api/admin/staff
// @access  Private (Super Admin)
exports.createStaffMember = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      staffRoleTitle = 'Operations Associate',
      department = 'Operations',
      permissions = ['orders:read'],
      isActive = true,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email address, and temporary password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An account with email '${cleanEmail}' already exists.`,
      });
    }

    const newStaff = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '+91 98000 00000',
      password,
      role: 'subadmin',
      staffRoleTitle: staffRoleTitle.trim(),
      department: department.trim(),
      permissions: Array.isArray(permissions) ? permissions : ['orders:read'],
      isActive: Boolean(isActive),
      status: isActive ? 'ACTIVE' : 'SUSPENDED',
      isVerified: true,
    });

    const staffObj = newStaff.toObject();
    delete staffObj.password;

    res.status(201).json({
      success: true,
      message: `Sub-admin account for '${name}' created successfully with ${permissions.length} granular permissions!`,
      data: staffObj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Sub-Admin Staff Details & Permissions
// @route   PUT /api/admin/staff/:id
// @access  Private (Super Admin)
exports.updateStaffMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staff = await User.findById(id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff account not found.',
      });
    }

    // Guardrail: Cannot modify superadmin core role or permissions via subadmin endpoint
    if (staff.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'You cannot modify Super Admin root credentials.',
      });
    }

    const {
      name,
      phone,
      password,
      staffRoleTitle,
      department,
      permissions,
      isActive,
      status,
    } = req.body;

    if (name) staff.name = name.trim();
    if (phone) staff.phone = phone.trim();
    if (staffRoleTitle) staff.staffRoleTitle = staffRoleTitle.trim();
    if (department) staff.department = department.trim();
    if (Array.isArray(permissions)) staff.permissions = permissions;
    if (isActive !== undefined) {
      staff.isActive = Boolean(isActive);
      staff.status = staff.isActive ? 'ACTIVE' : 'SUSPENDED';
    }
    if (status) staff.status = status;

    if (password && password.trim().length >= 6) {
      staff.password = password.trim();
    }

    await staff.save();

    const staffObj = staff.toObject();
    delete staffObj.password;

    res.status(200).json({
      success: true,
      message: `Staff profile for '${staff.name}' updated successfully!`,
      data: staffObj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Sub-Admin Staff Member
// @route   DELETE /api/admin/staff/:id
// @access  Private (Super Admin)
exports.deleteStaffMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staff = await User.findById(id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff account not found.',
      });
    }

    if (staff.role === 'superadmin' || staff.email === 'admin@auramarket.com') {
      return res.status(400).json({
        success: false,
        message: 'Root Super Admin account cannot be deleted.',
      });
    }

    if (staff._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own active administrator account.',
      });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Staff account '${staff.name}' (${staff.email}) deleted permanently.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Sub-Admin Active / Suspended Status
// @route   PATCH /api/admin/staff/:id/toggle-status
// @access  Private (Super Admin)
exports.toggleStaffStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staff = await User.findById(id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff account not found.',
      });
    }

    if (staff.role === 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot suspend Super Admin account.',
      });
    }

    staff.isActive = !staff.isActive;
    staff.status = staff.isActive ? 'ACTIVE' : 'SUSPENDED';
    await staff.save();

    res.status(200).json({
      success: true,
      message: `Staff status updated to ${staff.status}!`,
      isActive: staff.isActive,
      status: staff.status,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get List of Defined Staff Roles
// @route   GET /api/admin/staff/roles
// @access  Private (Super Admin)
exports.getStaffRoles = async (req, res, next) => {
  try {
    await seedDefaultRoles();
    const roles = await StaffRole.find().sort({ isSystemRole: -1, createdAt: 1 });

    // Compute live assigned count for each role
    const enriched = await Promise.all(
      roles.map(async (role) => {
        const count = await User.countDocuments({
          role: 'subadmin',
          staffRoleTitle: role.title || role.name,
        });
        role.assignedStaffCount = count;
        return role;
      })
    );

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create New Custom Staff Role
// @route   POST /api/admin/staff/roles
// @access  Private (Super Admin)
exports.createStaffRole = async (req, res, next) => {
  try {
    const { name, code, title, description, department, permissions } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Role name and unique code are required.',
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await StaffRole.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A staff role with code '${cleanCode}' already exists.`,
      });
    }

    const newRole = await StaffRole.create({
      name: name.trim(),
      code: cleanCode,
      title: title ? title.trim() : name.trim(),
      description: description ? description.trim() : '',
      department: department || 'Operations',
      permissions: Array.isArray(permissions) ? permissions : [],
      isSystemRole: false,
    });

    res.status(201).json({
      success: true,
      message: `Custom role '${newRole.name}' created successfully with ${newRole.permissions.length} permissions!`,
      data: newRole,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Staff Role Permissions & Details
// @route   PUT /api/admin/staff/roles/:id
// @access  Private (Super Admin)
exports.updateStaffRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const role = await StaffRole.findById(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Staff role not found.',
      });
    }

    const { name, title, description, department, permissions, isActive } = req.body;

    if (name) role.name = name.trim();
    if (title) role.title = title.trim();
    if (description !== undefined) role.description = description.trim();
    if (department) role.department = department;
    if (Array.isArray(permissions)) role.permissions = permissions;
    if (isActive !== undefined) role.isActive = Boolean(isActive);

    await role.save();

    res.status(200).json({
      success: true,
      message: `Staff role '${role.name}' updated successfully!`,
      data: role,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Custom Staff Role
// @route   DELETE /api/admin/staff/roles/:id
// @access  Private (Super Admin)
exports.deleteStaffRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const role = await StaffRole.findById(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Staff role not found.',
      });
    }

    if (role.isSystemRole) {
      return res.status(400).json({
        success: false,
        message: 'System protected roles cannot be deleted.',
      });
    }

    // Check if staff members are currently assigned
    const assignedCount = await User.countDocuments({
      role: 'subadmin',
      staffRoleTitle: role.title || role.name,
    });

    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role '${role.name}' because ${assignedCount} active staff member(s) are assigned to it. Reassign staff first.`,
      });
    }

    await StaffRole.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Staff role '${role.name}' deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Current User's Effective Permissions for Dynamic UI Gating
// @route   GET /api/staff/me/permissions
// @access  Private
exports.getMyEffectivePermissions = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const isSuperAdmin = req.user.role === 'superadmin';
    const permissions = isSuperAdmin
      ? ['all']
      : Array.isArray(req.user.permissions)
      ? req.user.permissions
      : [];

    res.status(200).json({
      success: true,
      data: {
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        staffRoleTitle: req.user.staffRoleTitle || (isSuperAdmin ? 'Chief Executive Officer' : 'Staff Member'),
        department: req.user.department || 'Operations',
        isSuperAdmin,
        permissions,
        status: req.user.status || 'ACTIVE',
      },
    });
  } catch (error) {
    next(error);
  }
};
