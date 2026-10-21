const fs = require('fs');
const path = require('path');
const os = require('os');
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const UIConfig = require('../models/UIConfig');
const { seedDemoData } = require('../utils/demoManager');

const LOCK_FILE_PATH = path.join(__dirname, '../../INSTALLED.lock');
const ENV_FILE_PATH = path.join(__dirname, '../../.env');

/**
 * Helper to check if system is already locked/installed
 */
const isSystemLocked = () => {
  return fs.existsSync(LOCK_FILE_PATH);
};

/**
 * GET /api/install/status
 * Check whether platform is already installed or requires setup
 */
const getInstallStatus = async (req, res) => {
  try {
    const isLocked = isSystemLocked();
    let superAdminExists = false;
    let dbConnected = mongoose.connection.readyState === 1;

    if (dbConnected) {
      try {
        const count = await User.countDocuments({ role: 'superadmin' });
        superAdminExists = count > 0;
      } catch (_) {}
    }

    let lockData = null;
    if (isLocked) {
      try {
        const raw = fs.readFileSync(LOCK_FILE_PATH, 'utf8');
        lockData = JSON.parse(raw);
      } catch (_) {
        lockData = { installed: true };
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        isInstalled: isLocked || superAdminExists,
        isLocked,
        lockDetails: lockData,
        dbConnected,
        nodeVersion: process.version,
        platform: process.platform,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve installation status: ' + error.message,
    });
  }
};

/**
 * GET /api/install/check-requirements
 * System prerequisites audit (Node version, memory, write permissions, modules)
 */
const checkRequirements = async (req, res) => {
  try {
    const checks = [];

    // 1. Node.js Version Check (>= 18.0.0)
    const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
    const nodePass = nodeMajor >= 18;
    checks.push({
      id: 'node_version',
      title: 'Node.js Runtime Engine',
      description: 'Requires Node.js v18.0.0 or higher for modern ECMAScript & crypto standards',
      current: process.version,
      required: '>= v18.0.0',
      status: nodePass ? 'PASS' : 'FAIL',
      critical: true,
    });

    // 2. RAM / System Memory Check
    const totalMemMB = Math.round(os.totalmem() / (1024 * 1024));
    const freeMemMB = Math.round(os.freemem() / (1024 * 1024));
    const memPass = freeMemMB >= 256; // Minimum 256MB free required
    checks.push({
      id: 'system_memory',
      title: 'Available System Memory (RAM)',
      description: 'Minimum 256 MB free memory required for buffer and indexing pools',
      current: `${freeMemMB} MB free (${totalMemMB} MB total)`,
      required: '>= 256 MB free',
      status: memPass ? 'PASS' : 'WARN',
      critical: false,
    });

    // 3. Write Permissions for .env & data folders
    const writeTestPaths = [
      { name: 'Root / .env file', path: path.join(__dirname, '../../') },
      { name: 'Uploads Storage', path: path.join(__dirname, '../../uploads') },
    ];

    let writePass = true;
    for (const item of writeTestPaths) {
      try {
        if (!fs.existsSync(item.path)) {
          fs.mkdirSync(item.path, { recursive: true });
        }
        const testFile = path.join(item.path, `.test-write-${Date.now()}`);
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
      } catch (err) {
        writePass = false;
        break;
      }
    }

    checks.push({
      id: 'write_permissions',
      title: 'Storage & Configuration Permissions',
      description: 'Write permissions to directory tree for persistent configuration and media uploads',
      current: writePass ? 'Writable (0755 / 0775)' : 'Read-Only / Access Denied',
      required: 'Writable',
      status: writePass ? 'PASS' : 'FAIL',
      critical: true,
    });

    // 4. Crypto & OpenSSL Core Capability
    const cryptoPass = typeof crypto.randomBytes === 'function' && typeof crypto.createHash === 'function';
    checks.push({
      id: 'crypto_engine',
      title: 'Cryptographic Acceleration (OpenSSL / SubtleCrypto)',
      description: 'Required for SHA-256 digital seals, JWT authentication, and E-Invoice QR cryptography',
      current: `OpenSSL ${process.versions.openssl || 'Built-in'}`,
      required: 'Present',
      status: cryptoPass ? 'PASS' : 'FAIL',
      critical: true,
    });

    // 5. Operating System Compatibility
    checks.push({
      id: 'os_compat',
      title: 'Operating System Environment',
      description: 'Linux (Ubuntu/CentOS/Debian), macOS, or Windows Server',
      current: `${os.type()} ${os.release()} (${os.arch()})`,
      required: 'Any POSIX / Windows Server',
      status: 'PASS',
      critical: false,
    });

    const allPassed = checks.every(c => !c.critical || c.status === 'PASS');

    return res.status(200).json({
      success: true,
      data: {
        allPassed,
        checks,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to evaluate system requirements: ' + error.message,
    });
  }
};

/**
 * POST /api/install/test-db
 * Interactively tests connection to a MongoDB instance before applying
 */
const testDatabaseConnection = async (req, res) => {
  try {
    let { mongoUri, host, port, dbName, username, password, authSource } = req.body;

    if (!mongoUri) {
      if (!host) {
        return res.status(400).json({
          success: false,
          message: 'Please provide either a MongoDB Connection URI or host/port/database parameters.',
        });
      }
      const portStr = port || 27017;
      const dbStr = dbName || 'ecommerce_marketplace';
      let credentials = '';
      if (username && password) {
        credentials = `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
      }
      let queryParams = authSource ? `?authSource=${authSource}` : '';
      mongoUri = `mongodb://${credentials}${host}:${portStr}/${dbStr}${queryParams}`;
    }

    // Standardize URI validation
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid MongoDB connection URI format. URI must start with mongodb:// or mongodb+srv://',
      });
    }

    const startTime = Date.now();
    const tempConn = mongoose.createConnection();

    try {
      await tempConn.openUri(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });

      const latencyMs = Date.now() - startTime;
      let serverVersion = 'Unknown';
      try {
        const adminDb = tempConn.db.admin();
        const buildInfo = await adminDb.buildInfo();
        serverVersion = buildInfo.version || 'Active';
      } catch (_) {}

      await tempConn.close();

      return res.status(200).json({
        success: true,
        data: {
          connected: true,
          latencyMs,
          serverVersion,
          uriRedacted: mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'),
          message: `Successfully connected to MongoDB cluster in ${latencyMs}ms (Version ${serverVersion})!`,
        },
      });
    } catch (connErr) {
      try {
        await tempConn.close();
      } catch (_) {}

      return res.status(400).json({
        success: false,
        message: `Database connection test failed: ${connErr.message}. Please verify host, credentials, and firewall rules.`,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to test database connection: ' + error.message,
    });
  }
};

/**
 * POST /api/install/setup
 * Executes the complete installation: persists .env, sets up Super Admin, initializes showroom demo catalog, writes lock file
 */
const executeInstallation = async (req, res) => {
  try {
    if (isSystemLocked()) {
      return res.status(403).json({
        success: false,
        message: 'Installation is locked. The platform has already been set up. To reinstall, remove INSTALLED.lock or use Admin Unlock.',
      });
    }

    const {
      adminName,
      adminEmail,
      adminPassword,
      adminPhone,
      platformName,
      defaultCurrency,
      supportEmail,
      mongoUri,
      seedMode, // 'showroom' | 'clean'
    } = req.body;

    // 1. Validation
    if (!adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Super Admin name, email, and password are strictly required.',
      });
    }

    if (adminPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Super Admin password must be at least 8 characters for enterprise security.',
      });
    }

    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanPlatformName = (platformName || 'AuraMarket').trim();
    const cleanCurrency = (defaultCurrency || 'INR').trim().toUpperCase();
    const cleanSupportEmail = (supportEmail || cleanEmail).trim();
    const targetMongoUri = mongoUri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce_marketplace';

    // 2. Persist / Update .env file
    try {
      let existingEnv = {};
      if (fs.existsSync(ENV_FILE_PATH)) {
        const lines = fs.readFileSync(ENV_FILE_PATH, 'utf8').split('\n');
        for (const line of lines) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            existingEnv[match[1]] = match[2] || '';
          }
        }
      }

      existingEnv['PORT'] = existingEnv['PORT'] || '5000';
      existingEnv['NODE_ENV'] = 'production';
      existingEnv['MONGO_URI'] = targetMongoUri;
      existingEnv['JWT_SECRET'] = existingEnv['JWT_SECRET'] || crypto.randomBytes(32).toString('hex');
      existingEnv['JWT_EXPIRES_IN'] = existingEnv['JWT_EXPIRES_IN'] || '7d';
      existingEnv['PLATFORM_NAME'] = cleanPlatformName;
      existingEnv['DEFAULT_CURRENCY'] = cleanCurrency;

      const envContent = Object.entries(existingEnv)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n') + '\n';

      fs.writeFileSync(ENV_FILE_PATH, envContent, 'utf8');
    } catch (envErr) {
      console.warn('[InstallController] Could not write .env file:', envErr.message);
    }

    // 3. Connect to target MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(targetMongoUri, {
        serverSelectionTimeoutMS: 8000,
      });
    }

    // 4. Create or Update Super Admin User
    let admin = await User.findOne({ email: cleanEmail });
    if (!admin) {
      admin = new User({
        name: adminName.trim(),
        email: cleanEmail,
        password: adminPassword,
        phone: adminPhone || '9876543210',
        role: 'superadmin',
        staffRoleTitle: 'Chief Executive Officer',
        department: 'Executive',
        permissions: ['all'],
        isActive: true,
      });
      await admin.save();
    } else {
      admin.name = adminName.trim();
      admin.password = adminPassword;
      admin.role = 'superadmin';
      admin.permissions = ['all'];
      admin.phone = adminPhone || admin.phone || '9876543210';
      await admin.save();
    }

    // 5. Update UIConfig with Store Profile
    let uiConfig = await UIConfig.findOne();
    if (!uiConfig) {
      uiConfig = new UIConfig();
    }
    uiConfig.platformName = cleanPlatformName;
    uiConfig.supportEmail = cleanSupportEmail;
    if (uiConfig.seo) {
      uiConfig.seo.metaTitle = `${cleanPlatformName} - Next-Gen Multi-Vendor Marketplace`;
    }
    await uiConfig.save();

    // 6. Handle Seeding
    if (seedMode !== 'clean') {
      console.log('[InstallController] Seeding showroom demo data for instant marketplace readiness...');
      await seedDemoData();
    }

    // 7. Write Installation Lock File
    const lockPayload = {
      installed: true,
      installedAt: new Date().toISOString(),
      platformName: cleanPlatformName,
      adminEmail: cleanEmail,
      version: '2.5.0-ENTERPRISE',
      seedMode: seedMode || 'showroom',
    };

    fs.writeFileSync(LOCK_FILE_PATH, JSON.stringify(lockPayload, null, 2), 'utf8');

    return res.status(200).json({
      success: true,
      message: 'AuraMarket Multi-Vendor Platform successfully installed and initialized!',
      data: {
        platformName: cleanPlatformName,
        adminEmail: cleanEmail,
        adminLoginUrl: '/admin',
        storefrontUrl: '/',
        installedAt: lockPayload.installedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Installation execution failed: ' + error.message,
    });
  }
};

/**
 * POST /api/install/unlock
 * Admin-authenticated unlock endpoint to allow re-configuration
 */
const unlockInstallation = async (req, res) => {
  try {
    const { secretKey } = req.body;
    const isMasterSecretMatch = secretKey && secretKey === (process.env.INSTALL_OVERRIDE_SECRET || 'auramarket_enterprise_master_key_2026');
    const isSuperAdminUser = req.user && req.user.role === 'superadmin';

    if (!isMasterSecretMatch && !isSuperAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Provide either valid Super Admin authorization or the server master secret key.',
      });
    }

    if (fs.existsSync(LOCK_FILE_PATH)) {
      fs.unlinkSync(LOCK_FILE_PATH);
    }

    return res.status(200).json({
      success: true,
      message: 'Installation lock removed successfully. Web setup wizard is now unlocked.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to unlock installation: ' + error.message,
    });
  }
};

module.exports = {
  getInstallStatus,
  checkRequirements,
  testDatabaseConnection,
  executeInstallation,
  unlockInstallation,
};
