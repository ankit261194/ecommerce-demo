class ProductVariant {
  final String sku;
  final String name;
  final double additionalPrice;
  final int stock;

  ProductVariant({
    required this.sku,
    required this.name,
    required this.additionalPrice,
    required this.stock,
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    return ProductVariant(
      sku: json['sku'] ?? '',
      name: json['name'] ?? '',
      additionalPrice: (json['additionalPrice'] ?? 0).toDouble(),
      stock: json['stock'] ?? 0,
    );
  }
}

class Product {
  final String id;
  final String title;
  final String description;
  final String category;
  final String brand;
  final double mrp;
  final double sellingPrice;
  final int stock;
  final String sku;
  final List<String> images;
  final double ratingsAverage;
  final String vendorName;
  final bool hasVariants;
  final List<ProductVariant> variants;

  Product({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.brand,
    required this.mrp,
    required this.sellingPrice,
    required this.stock,
    required this.sku,
    required this.images,
    required this.ratingsAverage,
    required this.vendorName,
    required this.hasVariants,
    required this.variants,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['_id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] is Map ? json['category']['name'] : 'General',
      brand: json['brand'] ?? '',
      mrp: (json['mrp'] ?? 0).toDouble(),
      sellingPrice: (json['sellingPrice'] ?? 0).toDouble(),
      stock: json['stock'] ?? 0,
      sku: json['sku'] ?? '',
      images: List<String>.from(json['images'] ?? []),
      ratingsAverage: (json['ratingsAverage'] ?? 4.5).toDouble(),
      vendorName: json['vendor'] is Map ? json['vendor']['storeName'] ?? 'Verified Store' : 'Verified Store',
      hasVariants: json['hasVariants'] ?? false,
      variants: (json['variants'] as List? ?? [])
          .map((v) => ProductVariant.fromJson(v))
          .toList(),
    );
  }
}
