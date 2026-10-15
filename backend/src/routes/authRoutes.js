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
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);

// Point #3: Instant Google 1-Tap & Mobile SMS OTP Frictionless Login
router.post('/otp/request', requestOtp);
router.post('/otp/verify', verifyOtp);
router.post('/google/one-tap', googleOneTapLogin);
router.post('/google', googleOneTapLogin);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Point #24: Multi-Address Book Routes
router.get('/addresses', protect, getAddresses);
router.post('/addresses', protect, addAddress);
router.put('/addresses/:id', protect, updateAddress);
router.delete('/addresses/:id', protect, deleteAddress);
router.patch('/addresses/:id/default', protect, setDefaultAddress);

module.exports = router;
