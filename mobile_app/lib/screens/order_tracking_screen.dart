import 'package:flutter/material.dart';
import '../constants/theme.dart';

class OrderTrackingScreen extends StatelessWidget {
  const OrderTrackingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.obsidianBg,
      appBar: AppBar(title: const Text('Live Order Tracking')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order ID Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.obsidianCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Master Order #ORD-849201', style: TextStyle(color: AppTheme.pearlWhite, fontWeight: FontWeight.bold, fontSize: 15)),
                      SizedBox(height: 4),
                      Text('Expected Delivery: Tomorrow by 4 PM', style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  Icon(Icons.check_circle, color: AppTheme.emeraldSuccess, size: 28),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Customer Delivery Handover OTP Box
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.amberAccent.withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.amberAccent, width: 1.5),
              ),
              child: const Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.vpn_key, color: AppTheme.amberAccent, size: 20),
                      SizedBox(width: 8),
                      Text('DELIVERY HANDOVER OTP', style: TextStyle(color: AppTheme.amberAccent, fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  ),
                  SizedBox(height: 10),
                  Text(
                    '4821',
                    style: TextStyle(color: AppTheme.pearlWhite, fontSize: 38, fontWeight: FontWeight.w900, letterSpacing: 8),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Share this 4-digit code with courier partner Vikram Singh only upon receiving your package.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // Stepper Progress
            const Text('Fulfillment Status', style: TextStyle(color: AppTheme.pearlWhite, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),

            _buildStep('Order Confirmed', 'Payment verified and sent to vendor', true, true),
            _buildStep('Packed by Vendor', 'Apex Tech Hub verified and packed items', true, true),
            _buildStep('Handed over to Courier', 'Courier partner Vikram Singh picked up parcel', true, true),
            _buildStep('Out for Delivery', 'Rider is on the way to your destination', true, false),
            _buildStep('Delivered with OTP', 'Handover completed via 4-digit code', false, false),
          ],
        ),
      ),
    );
  }

  Widget _buildStep(String title, String subtitle, bool isCompleted, bool showLine) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: isCompleted ? AppTheme.amberAccent : AppTheme.obsidianCard,
                shape: BoxShape.circle,
                border: Border.all(color: isCompleted ? AppTheme.amberAccent : Colors.white24),
              ),
              child: isCompleted
                  ? const Icon(Icons.check, size: 14, color: AppTheme.obsidianBg)
                  : null,
            ),
            if (showLine)
              Container(
                width: 2,
                height: 40,
                color: isCompleted ? AppTheme.amberAccent : Colors.white12,
              ),
          ],
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: isCompleted ? AppTheme.pearlWhite : AppTheme.textMuted,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
              ),
              const SizedBox(height: 18),
            ],
          ),
        ),
      ],
    );
  }
}
