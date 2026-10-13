import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/product.dart';
import '../models/order.dart';

class ApiService {
  static const String baseUrl = 'http://10.0.2.2:5000/api'; // Android emulator localhost

  static Future<List<Product>> fetchProducts() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/products')).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final list = data['data'] as List;
        return list.map((json) => Product.fromJson(json)).toList();
      }
    } catch (_) {
      // Fallback to pre-loaded products if backend is running on alternate host
    }

    return _fallbackProducts();
  }

  static Future<Map<String, dynamic>> fetchUIConfig() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/ui/config')).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        return data['data'];
      }
    } catch (_) {}

    return {
      'storeName': 'AuraMarket',
      'heroBannerTitle': 'Spatial Audio Reinvented',
      'heroBannerSubtitle': 'Flagship ANC acoustics.',
      'announcementText': '🔥 Festive Sale Live! Up to 40% OFF',
    };
  }

  static Future<Map<String, dynamic>?> createOrder({
    required List<Map<String, dynamic>> items,
    required Map<String, dynamic> shippingAddress,
    String paymentMethod = 'COD',
    String? token,
  }) async {
    try {
      final res = await http
          .post(
            Uri.parse('$baseUrl/orders'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${token ?? "mock_jwt_customer_token_2026"}',
            },
            body: json.encode({
              'items': items,
              'shippingAddress': shippingAddress,
              'paymentMethod': paymentMethod,
            }),
          )
          .timeout(const Duration(seconds: 5));
      if (res.statusCode == 201) {
        final data = json.decode(res.body);
        return data['data'];
      }
    } catch (_) {}
    return null;
  }

  static Future<List<dynamic>> fetchDeliveryTasks({String? token}) async {
    try {
      final res = await http
          .get(
            Uri.parse('$baseUrl/delivery/tasks'),
            headers: {
              'Authorization': 'Bearer ${token ?? "mock_jwt_delivery_token_2026"}',
            },
          )
          .timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        return data['data'] as List;
      }
    } catch (_) {}
    return [];
  }

  static Future<bool> verifyDeliveryOtp(String taskId, String otp, {double amountCollected = 0, String? token}) async {
    try {
      final res = await http
          .post(
            Uri.parse('$baseUrl/delivery/tasks/$taskId/verify-otp'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${token ?? "mock_jwt_delivery_token_2026"}',
            },
            body: json.encode({
              'otp': otp,
              'amountCollected': amountCollected,
            }),
          )
          .timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  static List<Product> _fallbackProducts() {
    return [
      Product(
        id: 'prod_001',
        title: 'Aura Pro ANC Wireless Noise-Cancelling Headphones',
        description: 'Studio-grade spatial acoustics with 40-hour battery life.',
        category: 'Electronics & Audio',
        brand: 'AuraAudio',
        mrp: 14999,
        sellingPrice: 8999,
        stock: 45,
        sku: 'APX-HEAD-001',
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
        ratingsAverage: 4.8,
        vendorName: 'Apex Tech Hub',
        hasVariants: true,
        variants: [
          ProductVariant(sku: 'APX-HEAD-BLK', name: 'Obsidian Black', additionalPrice: 0, stock: 25),
          ProductVariant(sku: 'APX-HEAD-SLV', name: 'Silver Matte', additionalPrice: 500, stock: 20),
        ],
      ),
      Product(
        id: 'prod_002',
        title: 'AeroWatch S9 Ultra Smartwatch with AMOLED Display',
        description: 'Titanium chassis, ECG heart tracking, GPS routing.',
        category: 'Watches',
        brand: 'AeroTech',
        mrp: 9999,
        sellingPrice: 4499,
        stock: 30,
        sku: 'APX-WTCH-002',
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
        ratingsAverage: 4.7,
        vendorName: 'Apex Tech Hub',
        hasVariants: false,
        variants: [],
      ),
      Product(
        id: 'prod_003',
        title: 'Obsidian Oversized Heavyweight Cotton Hoodie',
        description: '450 GSM French terry cotton with tailored dropped shoulders.',
        category: 'Fashion',
        brand: 'Vogue Urban',
        mrp: 3999,
        sellingPrice: 1999,
        stock: 60,
        sku: 'VOG-HOD-001',
        images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800'],
        ratingsAverage: 4.9,
        vendorName: 'Vogue Trends Apparel',
        hasVariants: true,
        variants: [
          ProductVariant(sku: 'VOG-HOD-M', name: 'Medium', additionalPrice: 0, stock: 20),
          ProductVariant(sku: 'VOG-HOD-L', name: 'Large', additionalPrice: 0, stock: 25),
        ],
      ),
    ];
  }
}
