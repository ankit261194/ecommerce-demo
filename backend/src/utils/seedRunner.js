require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const { seedDemoData, wipeDemoData } = require('./demoManager');

const run = async () => {
  try {
    await connectDB();
    const command = process.argv[2];

    if (command === 'wipe') {
      await wipeDemoData();
      console.log('✅ Wipe completed.');
    } else {
      await seedDemoData();
      console.log('✅ Seed completed.');
    }

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('❌ Execution error:', err);
    process.exit(1);
  }
};

run();
