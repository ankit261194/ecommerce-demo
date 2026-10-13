class SubOrderSummary {
  final String subOrderId;
  final String vendorName;
  final double subTotal;
  final String status;
  final String deliveryOtp;

  SubOrderSummary({
    required this.subOrderId,
    required this.vendorName,
    required this.subTotal,
    required this.status,
    required this.deliveryOtp,
  });

  factory SubOrderSummary.fromJson(Map<String, dynamic> json) {
    return SubOrderSummary(
      subOrderId: json['_id'] ?? '',
      vendorName: json['vendor'] is Map ? json['vendor']['storeName'] ?? 'Partner' : 'Partner',
      subTotal: (json['subTotal'] ?? 0).toDouble(),
      status: json['status'] ?? 'placed',
      deliveryOtp: json['deliveryOtp'] ?? '4821',
    );
  }
}

class OrderSummary {
  final String orderId;
  final double totalAmount;
  final String paymentMethod;
  final List<SubOrderSummary> subOrders;
  final DateTime createdAt;

  OrderSummary({
    required this.orderId,
    required this.totalAmount,
    required this.paymentMethod,
    required this.subOrders,
    required this.createdAt,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    return OrderSummary(
      orderId: json['orderNumber'] ?? json['_id'] ?? '',
      totalAmount: (json['totalAmount'] ?? 0).toDouble(),
      paymentMethod: json['paymentMethod'] ?? 'COD',
      subOrders: (json['subOrders'] as List? ?? [])
          .map((s) => SubOrderSummary.fromJson(s))
          .toList(),
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }
}
