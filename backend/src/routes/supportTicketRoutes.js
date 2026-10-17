const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const {
  createTicket,
  getMyTickets,
  getTicketById,
  addMessageReply,
  closeTicket,
  getAdminTickets,
  assignTicket,
  updateTicketStatus,
  getTicketAnalytics,
  simulateAgentReply,
} = require('../controllers/supportTicketController');

// All support ticket routes require authentication
router.use(protect);

// Analytics
router.get('/analytics', getTicketAnalytics);

// Admin ticket management
router.get('/admin', authorize('superadmin', 'admin', 'subadmin', 'agent'), getAdminTickets);

// Customer tickets
router.get('/my', getMyTickets);

// Smart root list: admin/agent gets admin view, customer gets their own tickets
router.get('/', (req, res, next) => {
  if (['superadmin', 'admin', 'subadmin', 'agent'].includes(req.user.role)) {
    return getAdminTickets(req, res, next);
  }
  return getMyTickets(req, res, next);
});

// Create ticket
router.post('/', createTicket);

// Single ticket & actions
router.get('/:id', getTicketById);
router.post('/:id/reply', addMessageReply);
router.put('/:id/reply', addMessageReply);
router.put('/:id/close', closeTicket);
router.post('/:id/close', closeTicket);
router.put('/:id/assign', authorize('superadmin', 'admin', 'subadmin', 'agent'), assignTicket);
router.put('/:id/status', authorize('superadmin', 'admin', 'subadmin', 'agent'), updateTicketStatus);
router.post('/:id/simulate-reply', simulateAgentReply);

module.exports = router;
