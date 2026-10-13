import 'package:flutter/material.dart';

class AppTheme {
  static const Color obsidianBg = Color(0xFF0B0F17);
  static const Color obsidianCard = Color(0xFF161F30);
  static const Color obsidianSurface = Color(0xFF1E293B);
  static const Color amberAccent = Color(0xFFF59E0B);
  static const Color amberGlow = Color(0xFFD97706);
  static const Color emeraldSuccess = Color(0xFF10B981);
  static const Color pearlWhite = Color(0xFFF8FAFC);
  static const Color textMuted = Color(0xFF94A3B8);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: obsidianBg,
      primaryColor: amberAccent,
      cardColor: obsidianCard,
      appBarTheme: const AppBarTheme(
        backgroundColor: obsidianBg,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: pearlWhite),
        titleTextStyle: TextStyle(
          color: pearlWhite,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: obsidianCard,
        selectedItemColor: amberAccent,
        unselectedItemColor: textMuted,
        type: BottomNavigationBarType.fixed,
      ),
    );
  }
}
