const admin = require('firebase-admin');
require('dotenv').config();

// 1. Initialize Default App (Host Firebase)
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL'
];

const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('❌ Missing environment variables for Host Firebase:', missing);
} else {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: privateKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin (Host) initialized successfully in Dashboard Backend');
  }
}

// 2. Initialize Secondary App (User Firebase)
let userAdmin = null;
const userRequiredEnvVars = [
  'USER_FIREBASE_PROJECT_ID',
  'USER_FIREBASE_PRIVATE_KEY',
  'USER_FIREBASE_CLIENT_EMAIL'
];

const userMissing = userRequiredEnvVars.filter(key => !process.env[key]);
if (userMissing.length > 0) {
  console.log('⚠️ Missing credentials for User Firebase. Push to consumers will fail unless added to .env. (Need: USER_FIREBASE_PROJECT_ID, USER_FIREBASE_PRIVATE_KEY, USER_FIREBASE_CLIENT_EMAIL)');
} else {
  const userPrivateKey = process.env.USER_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const userServiceAccount = {
    type: "service_account",
    project_id: process.env.USER_FIREBASE_PROJECT_ID,
    private_key: userPrivateKey,
    client_email: process.env.USER_FIREBASE_CLIENT_EMAIL
  };

  // Only initialize if not already initialized
  const apps = admin.apps.map(a => a.name);
  if (!apps.includes('userApp')) {
    userAdmin = admin.initializeApp({
      credential: admin.credential.cert(userServiceAccount)
    }, 'userApp');
    console.log('✅ Firebase Admin (User) initialized successfully in Dashboard Backend');
  } else {
    userAdmin = admin.app('userApp');
  }
}

module.exports = { admin, userAdmin };
