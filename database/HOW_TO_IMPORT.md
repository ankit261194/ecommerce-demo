# AuraMarket Database Setup & Import Guide

## Option 1: 1-Click Automated Seeder (Recommended)
Navigate to `backend/` and run:
```bash
npm run seed
```
This seeds complete showcase data:
- Super Admin, Sub-Admins, Vendors, Delivery Riders, and Shopper Accounts
- Multi-category taxonomy (Electronics, Fashion, Watches, Living)
- Multi-variant products with SKU barcodes and inventory
- Commission rules, coupons, flash sales, and delivery zones

To reset data at any time:
```bash
npm run seed:wipe
npm run seed
```

## Option 2: 1-Click Docker Orchestration
If you deploy using Docker:
```bash
docker compose up -d
```
MongoDB 7.0 and Redis are provisioned and initialized automatically.

## Option 3: MongoDB Compass Import
1. Open MongoDB Compass and connect to `mongodb://localhost:27017`.
2. Create database `ecommerce_marketplace`.
3. Import collections from `database/database_seed.json`.
