/**
 * Point 5: Interactive Google Maps Pin-Drop Address Picker with Reverse Geocoding
 * Controller handling reverse geocoding, place lookup, map config, and saving map-picked addresses
 */

const geocodingService = require('../services/geocodingService');
const User = require('../models/User');

exports.reverseGeocode = async (req, res) => {
  try {
    const lat = req.query.lat || req.body.lat;
    const lng = req.query.lng || req.body.lng;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Latitude (lat) and Longitude (lng) are required',
      });
    }

    const address = await geocodingService.reverseGeocode(lat, lng);
    return res.json({
      success: true,
      address,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Reverse geocoding failed',
    });
  }
};

exports.searchPlaces = async (req, res) => {
  try {
    const query = req.query.query || req.body.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const results = await geocodingService.searchPlaces(query);
    return res.json({
      success: true,
      results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Place search failed',
    });
  }
};

exports.getMapConfig = async (req, res) => {
  try {
    return res.json({
      success: true,
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
        defaultCenter: { lat: 28.6139, lng: 77.2090 }, // New Delhi
        defaultZoom: 15,
        hubs: [
          { name: 'Connaught Place, New Delhi', lat: 28.6315, lng: 77.2167 },
          { name: 'Bandra West, Mumbai', lat: 19.0596, lng: 72.8295 },
          { name: 'Indiranagar, Bengaluru', lat: 12.9784, lng: 77.6408 },
          { name: 'Hitech City, Hyderabad', lat: 17.4474, lng: 78.3762 },
          { name: 'Sector 18, Noida', lat: 28.5708, lng: 77.3261 },
          { name: 'DLF Cyber City, Gurugram', lat: 28.4908, lng: 77.0894 },
          { name: 'T Nagar, Chennai', lat: 13.0418, lng: 80.2341 },
          { name: 'Koregaon Park, Pune', lat: 18.5362, lng: 73.8940 },
        ],
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve map config',
    });
  }
};

exports.saveMapAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const {
      street,
      sublocality,
      landmark,
      city,
      state,
      pincode,
      country = 'India',
      coordinates,
      formattedAddress,
      tag = 'Home',
      isDefault = false,
    } = req.body;

    if (!street || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Street, city, state, and pincode are required',
      });
    }

    if (isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    const recipientName = req.body.recipientName || user.name || 'Customer';
    const phone = req.body.phone || user.phone || '9876543210';

    const newAddress = {
      recipientName,
      phone,
      street,
      landmark: landmark || sublocality || '',
      city,
      state,
      pincode,
      country,
      coordinates: coordinates || { lat: 28.6139, lng: 77.2090 },
      formattedAddress: formattedAddress || `${street}, ${city}, ${state} - ${pincode}`,
      type: tag ? tag.toUpperCase() : 'HOME',
      tag,
      isDefault: Boolean(isDefault) || user.addresses.length === 0,
    };

    user.addresses.push(newAddress);
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Address saved with coordinates',
      addresses: user.addresses,
      savedAddress: user.addresses[user.addresses.length - 1],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save address',
    });
  }
};
