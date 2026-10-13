const mongoose = require('mongoose');

let mongoMemoryServer = null;
let isInMemory = false;
let connectingPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    const targetUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce_marketplace';

    // 1. Attempt to connect to configured/local MongoDB
    try {
      const conn = await mongoose.connect(targetUri, {
        serverSelectionTimeoutMS: 2000,
      });
      console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (externalErr) {
      console.warn(`[Database] Local/External MongoDB not reachable at ${targetUri} (${externalErr.message}).`);
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_IN_MEMORY !== 'true') {
        console.error('[Database Error] Fatal: In-memory fallback is disabled in production to protect persistent data. Set ALLOW_IN_MEMORY=true to override.');
        throw externalErr;
      }
      console.log('[Database] Initiating seamless In-Memory MongoDB Engine for instant zero-dependency execution...');
    }

    // 2. Graceful in-memory fallback using MongoMemoryServer
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryServer.getUri();
      const conn = await mongoose.connect(memoryUri);
      isInMemory = true;
      console.log(`[Database] In-Memory MongoDB Active: ${memoryUri}`);

      // Auto-seed demo data so the platform is immediately operational out-of-the-box
      const { seedDemoData } = require('../utils/demoManager');
      await seedDemoData();
      console.log('[Database] Pre-loaded full demo catalog, personas, and system config into In-Memory store.');
      return conn;
    } catch (memErr) {
      console.error(`[Database Error] Failed to initialize in-memory database: ${memErr.message}`);
      throw memErr;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      mongoMemoryServer = null;
    }
  } catch (err) {
    console.error('[Database Disconnect Error]:', err.message);
  }
};

const getDbStatus = () => ({
  connected: mongoose.connection.readyState === 1,
  isInMemory,
  host: mongoose.connection.host || 'unknown',
});

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;
module.exports.getDbStatus = getDbStatus;
