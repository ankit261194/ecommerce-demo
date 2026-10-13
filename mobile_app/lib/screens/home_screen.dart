import 'package:flutter/material.dart';
import '../constants/theme.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import 'product_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Product> products = [];
  bool isLoading = true;
  String selectedCategory = 'All';

  @override
  void initState() {
    super.initState();
    loadData();
  }

  void loadData() async {
    final list = await ApiService.fetchProducts();
    setState(() {
      products = list;
      isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final categories = ['All', 'Electronics & Audio', 'Fashion', 'Watches'];

    return Scaffold(
      backgroundColor: AppTheme.obsidianBg,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.amberAccent,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text('A', style: TextStyle(color: AppTheme.obsidianBg, fontWeight: FontWeight.w900, fontSize: 16)),
            ),
            const SizedBox(width: 8),
            const Text('AuraMarket', style: TextStyle(color: AppTheme.pearlWhite, fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: AppTheme.pearlWhite),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.notifications_none, color: AppTheme.pearlWhite),
            onPressed: () {},
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.amberAccent))
          : RefreshIndicator(
              onRefresh: () async => loadData(),
              color: AppTheme.amberAccent,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Dynamic Hero Banner
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppTheme.obsidianCard,
                            AppTheme.amberAccent.withOpacity(0.25),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white10),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.amberAccent.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppTheme.amberAccent),
                            ),
                            child: const Text('FESTIVE LAUNCH 2026', style: TextStyle(color: AppTheme.amberAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Spatial Audio\nReinvented',
                            style: TextStyle(color: AppTheme.pearlWhite, fontSize: 24, fontWeight: FontWeight.w900, height: 1.15),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Studio-grade acoustics with active noise cancellation.',
                            style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Category Filter Pills
                    SizedBox(
                      height: 38,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: categories.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final cat = categories[index];
                          final isSelected = selectedCategory == cat;
                          return ChoiceChip(
                            label: Text(cat),
                            selected: isSelected,
                            onSelected: (_) => setState(() => selectedCategory = cat),
                            selectedColor: AppTheme.amberAccent,
                            backgroundColor: AppTheme.obsidianCard,
                            labelStyle: TextStyle(
                              color: isSelected ? AppTheme.obsidianBg : AppTheme.pearlWhite,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            side: BorderSide(color: isSelected ? AppTheme.amberAccent : Colors.white10),
                          );
                        },
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Featured Catalog Grid
                    const Text('Trending Products', style: TextStyle(color: AppTheme.pearlWhite, fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),

                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.68,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: products.length,
                      itemBuilder: (context, index) {
                        final product = products[index];
                        return GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ProductDetailScreen(product: product),
                              ),
                            );
                          },
                          child: Container(
                            decoration: BoxDecoration(
                              color: AppTheme.obsidianCard,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.white10),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                ClipRRect(
                                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                                  child: Image.network(
                                    product.images.isNotEmpty ? product.images[0] : '',
                                    height: 140,
                                    width: double.infinity,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(color: Colors.white12, height: 140),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        product.brand.toUpperCase(),
                                        style: const TextStyle(color: AppTheme.amberAccent, fontSize: 9, fontWeight: FontWeight.bold),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        product.title,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(color: AppTheme.pearlWhite, fontSize: 12, fontWeight: FontWeight.w600),
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            '₹${product.sellingPrice.toInt()}',
                                            style: const TextStyle(color: AppTheme.pearlWhite, fontSize: 14, fontWeight: FontWeight.w900),
                                          ),
                                          Text(
                                            '₹${product.mrp.toInt()}',
                                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 10, decoration: TextDecoration.lineThrough),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
