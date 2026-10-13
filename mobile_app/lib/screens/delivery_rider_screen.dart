import 'package:flutter/material.dart';
import '../constants/theme.dart';
import '../services/api_service.dart';

class DeliveryRiderScreen extends StatefulWidget {
  final String? taskId;
  final String? expectedOtp;

  const DeliveryRiderScreen({super.key, this.taskId, this.expectedOtp});

  @override
  State<DeliveryRiderScreen> createState() => _DeliveryRiderScreenState();
}

class _DeliveryRiderScreenState extends State<DeliveryRiderScreen> {
  final TextEditingController otpController = TextEditingController();
  bool isDelivered = false;
  bool isSubmitting = false;
  String? errorMessage;

  Future<void> handleVerifyOtp() async {
    final entered = otpController.text.trim();
    if (entered.length != 4) {
      setState(() {
        errorMessage = 'Please enter a 4-digit numeric code.';
      });
      return;
    }

    setState(() {
      isSubmitting = true;
      errorMessage = null;
    });

    bool success = false;
    if (widget.taskId != null) {
      success = await ApiService.verifyDeliveryOtp(widget.taskId!, entered);
    }

    // Fallback check against expected or default demo OTP
    final validOtp = widget.expectedOtp ?? '4821';
    if (success || entered == validOtp) {
      setState(() {
        isDelivered = true;
        isSubmitting = false;
        errorMessage = null;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ OTP Verified! Order successfully DELIVERED.'),
            backgroundColor: AppTheme.emeraldSuccess,
          ),
        );
      }
    } else {
      setState(() {
        isSubmitting = false;
        errorMessage = 'Invalid OTP! Ask customer for 4-digit code on their app screen.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.obsidianBg,
      appBar: AppBar(title: const Text('Rider Delivery Hub')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Task Card
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Task #DEL-101', style: TextStyle(color: AppTheme.pearlWhite, fontWeight: FontWeight.bold, fontSize: 16)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isDelivered ? AppTheme.emeraldSuccess.withOpacity(0.2) : AppTheme.amberAccent.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          isDelivered ? 'DELIVERED' : 'OUT FOR DELIVERY',
                          style: TextStyle(
                            color: isDelivered ? AppTheme.emeraldSuccess : AppTheme.amberAccent,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(color: Colors.white10, height: 20),
                  const Text('Pickup: Apex Tech Hub (Shop 14, Commercial Complex, Noida)', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                  const SizedBox(height: 6),
                  const Text('Drop: Aman Sharma (Flat 402, Green Valley Apartments, Delhi)', style: TextStyle(color: AppTheme.pearlWhite, fontSize: 12, fontWeight: FontWeight.bold)),
                ],
              ),
            ),

            const SizedBox(height: 24),

            if (!isDelivered) ...[
              const Text('Customer OTP Verification', style: TextStyle(color: AppTheme.pearlWhite, fontSize: 15, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              const Text('Ask customer for their 4-digit secret delivery code to finish handover.', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
              const SizedBox(height: 12),

              TextField(
                controller: otpController,
                keyboardType: TextInputType.number,
                maxLength: 4,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 8, color: AppTheme.amberAccent),
                decoration: InputDecoration(
                  hintText: '4821',
                  hintStyle: const TextStyle(color: Colors.white24),
                  filled: true,
                  fillColor: AppTheme.obsidianCard,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.white24)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.amberAccent)),
                ),
              ),

              if (errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(errorMessage!, style: const TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                ),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: handleVerifyOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.emeraldSuccess,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Verify OTP & Complete Delivery', style: TextStyle(color: AppTheme.obsidianBg, fontWeight: FontWeight.w900, fontSize: 15)),
                ),
              ),
            ] else ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppTheme.emeraldSuccess.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.emeraldSuccess),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.check_circle, color: AppTheme.emeraldSuccess, size: 48),
                    SizedBox(height: 12),
                    Text('Delivery Completed & Verified', style: TextStyle(color: AppTheme.pearlWhite, fontSize: 16, fontWeight: FontWeight.bold)),
                    SizedBox(height: 4),
                    Text('Customer OTP was verified successfully.', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
