import 'package:flutter/material.dart';
import '../constants/theme.dart';
import '../models/product.dart';

class ProductDetailScreen extends StatefulWidget {
  final Product product;
  const ProductDetailScreen({super.key, required this.product});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  ProductVariant? selectedVariant;

  @override
  void initState() {
    super.initState();
    if (widget.product.hasVariants && widget.product.variants.isNotEmpty) {
      selectedVariant = widget.product.variants[0];
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final currentPrice = selectedVariant != null
        ? p.sellingPrice + selectedVariant!.additionalPrice
        : p.sellingPrice;

    return Scaffold(
      backgroundColor: AppTheme.obsidianBg,
      appBar: AppBar(
        title: Text(p.title, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Main Product Image
            Image.network(
              p.images.isNotEmpty ? p.images[0] : '',
              height: 280,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(color: Colors.white12, height: 280),
            ),

            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.amberAccent.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Sold by ${p.vendorName}',
                          style: const TextStyle(color: AppTheme.amberAccent, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                      Row(
                        children: [
                          const Icon(Icons.star, color: AppTheme.amberAccent, size: 16),
                          const SizedBox(width: 4),
                          Text('${p.ratingsAverage} (42 reviews)', style: const TextStyle(color: AppTheme.pearlWhite, fontSize: 12)),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),
                  Text(p.title, style: const TextStyle(color: AppTheme.pearlWhite, fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),

                  Row(
                    children: [
                      Text('₹${currentPrice.toInt()}', style: const TextStyle(color: AppTheme.pearlWhite, fontSize: 24, fontWeight: FontWeight.w900)),
                      const SizedBox(width: 10),
                      Text('₹${p.mrp.toInt()}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 14, decoration: TextDecoration.lineThrough)),
                    ],
                  ),

                  const SizedBox(height: 20),
                  const Text('Description', style: TextStyle(color: AppTheme.pearlWhite, fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Text(p.description, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13, height: 1.4)),

                  if (p.hasVariants) ...[
                    const SizedBox(height: 24),
                    const Text('Select Variant', style: TextStyle(color: AppTheme.pearlWhite, fontSize: 14, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 10,
                      children: p.variants.map((v) {
                        final isSel = selectedVariant?.sku == v.sku;
                        return ChoiceChip(
                          label: Text(v.name),
                          selected: isSel,
                          onSelected: (_) => setState(() => selectedVariant = v),
                          selectedColor: AppTheme.amberAccent,
                          backgroundColor: AppTheme.obsidianCard,
                          labelStyle: TextStyle(
                            color: isSel ? AppTheme.obsidianBg : AppTheme.pearlWhite,
                            fontWeight: FontWeight.bold,
                          ),
                        );
                      }).toList(),
                    ),
                  ],
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
        child: ElevatedButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Added ${p.title} to Cart!'),
                backgroundColor: AppTheme.emeraldSuccess,
              ),
            );
          },
          icon: const Icon(Icons.shopping_bag, color: AppTheme.obsidianBg),
          label: const Text('Add to Cart', style: TextStyle(color: AppTheme.obsidianBg, fontWeight: FontWeight.w900, fontSize: 16)),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.amberAccent,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ),
    );
  }
}
