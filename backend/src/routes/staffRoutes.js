const express = require('express');
const router = express.Router();
const {
  getPermissionsCatalog,
  getStaffMembers,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  toggleStaffStatus,
  getStaffRoles,
  createStaffRole,
  updateStaffRole,
  deleteStaffRole,
  getMyEffectivePermissions,
} = require('../controllers/staffController');
const { protect, authorize } = require('../middlewares/auth');

// Current authenticated user's permissions (Accessible by any logged-in staff/admin)
router.get('/me/permissions', protect, getMyEffectivePermissions);

// Super Admin & Staff Management Endpoints
router.get('/permissions', protect, authorize('superadmin', 'admin'), getPermissionsCatalog);

// Staff Roles Management
router.get('/roles', protect, authorize('superadmin', 'admin'), getStaffRoles);
router.post('/roles', protect, authorize('superadmin'), createStaffRole);
router.put('/roles/:id', protect, authorize('superadmin'), updateStaffRole);
router.delete('/roles/:id', protect, authorize('superadmin'), deleteStaffRole);

// Sub-Admin Staff Members Management
router.get('/', protect, authorize('superadmin', 'admin'), getStaffMembers);
router.post('/', protect, authorize('superadmin'), createStaffMember);
router.put('/:id', protect, authorize('superadmin'), updateStaffMember);
router.delete('/:id', protect, authorize('superadmin'), deleteStaffMember);
router.patch('/:id/toggle-status', protect, authorize('superadmin'), toggleStaffStatus);

module.exports = router;
