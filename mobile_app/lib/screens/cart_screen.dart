import 'package:flutter/material.dart';
import '../constants/theme.dart';
import 'order_tracking_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.obsidianBg,
      appBar: AppBar(title: const Text('My Cart')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Multi-Vendor Splitting Notice
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.amberAccent.withOpacity(0.12),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.amberAccent.withOpacity(0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.local_shipping, color: AppTheme.amberAccent, size: 22),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Multi-Vendor Order Notice', style: TextStyle(color: AppTheme.amberAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                        SizedBox(height: 2),
                        Text('Items are fulfilled directly from verified partner warehouses for maximum freshness and speed.', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Package 1: Apex Tech Hub
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.obsidianCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Package 1: Apex Tech Hub', style: TextStyle(color: AppTheme.amberAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                  const Divider(color: Colors.white10, height: 16),
                  Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
                          width: 60,
                          height: 60,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Aura Pro ANC Wireless Headphones', style: TextStyle(color: AppTheme.pearlWhite, fontSize: 13, fontWeight: FontWeight.bold), maxLines: 1),
                            Text('Variant: Obsidian Black', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                            SizedBox(height: 4),
                            Text('₹8,999', style: TextStyle(color: AppTheme.pearlWhite, fontSize: 14, fontWeight: FontWeight.w900)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Price Summary
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.obsidianCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: const Column(
                children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text('Items Total', style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                    Text('₹8,999', style: TextStyle(color: AppTheme.pearlWhite, fontSize: 13, fontWeight: FontWeight.bold)),
                  ]),
                  SizedBox(height: 8),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text('Delivery Charges', style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                    Text('FREE', style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 13, fontWeight: FontWeight.bold)),
                  ]),
                  Divider(color: Colors.white10, height: 20),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text('Total Payable', style: TextStyle(color: AppTheme.pearlWhite, fontSize: 16, fontWeight: FontWeight.bold)),
                    Text('₹8,999', style: TextStyle(color: AppTheme.amberAccent, fontSize: 18, fontWeight: FontWeight.w900)),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          color: AppTheme.obsidianCard,
          border: Border(top: BorderSide(color: Colors.white10)),
        ),
        child: ElevatedButton(
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const OrderTrackingScreen()),
            );
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.amberAccent,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: const Text('Proceed to Checkout', style: TextStyle(color: AppTheme.obsidianBg, fontWeight: FontWeight.w900, fontSize: 16)),
        ),
      ),
    );
  }
}
