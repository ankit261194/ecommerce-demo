const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  requestOtp,
  verifyOtp,
  googleOneTapLogin,
  appleLogin,
  socialLogin,
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);

// Point 1: 1-Click Social Login (Google OAuth2 & Apple ID integration with backend JWT)
router.post('/otp/request', requestOtp);
router.post('/otp/verify', verifyOtp);
router.post('/google/one-tap', googleOneTapLogin);
router.post('/google', googleOneTapLogin);
router.post('/apple', appleLogin);
router.post('/social-login', socialLogin);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Point #24: Multi-Address Book Routes
router.get('/addresses', protect, getAddresses);
router.post('/addresses', protect, addAddress);
router.put('/addresses/:id', protect, updateAddress);
router.delete('/addresses/:id', protect, deleteAddress);
router.patch('/addresses/:id/default', protect, setDefaultAddress);

module.exports = router;
