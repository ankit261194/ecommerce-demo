import 'package:flutter/material.dart';
import 'constants/theme.dart';
import 'screens/home_screen.dart';
import 'screens/cart_screen.dart';
import 'screens/order_tracking_screen.dart';
import 'screens/delivery_rider_screen.dart';

void main() {
  runApp(const AuraMarketApp());
}

class AuraMarketApp extends StatelessWidget {
  const AuraMarketApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AuraMarket',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const MainNavigationShell(),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    HomeScreen(),
    CartScreen(),
    OrderTrackingScreen(),
    DeliveryRiderScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        backgroundColor: AppTheme.obsidianCard,
        selectedItemColor: AppTheme.amberAccent,
        unselectedItemColor: AppTheme.textMuted,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.storefront),
            label: 'Store',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.shopping_bag_outlined),
            label: 'Cart',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.track_changes),
            label: 'Track',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.delivery_dining),
            label: 'Rider',
          ),
        ],
      ),
    );
  }
}
