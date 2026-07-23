const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

// Load .env directly from root first
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: true });
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

let db = null;
let auth = null;
let firebaseReady = false;

const projectId = process.env.FIREBASE_PROJECT_ID;
let rawKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();
if (rawKey.startsWith('"') && rawKey.endsWith('"')) {
  rawKey = rawKey.substring(1, rawKey.length - 1);
} else if (rawKey.endsWith('"')) {
  rawKey = rawKey.substring(0, rawKey.length - 1);
}
const privateKey = rawKey.replace(/\\n/g, '\n');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (projectId && privateKey && clientEmail) {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });
    }
    db = admin.firestore();
    auth = admin.auth();
    firebaseReady = true;
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
  }
} else {
  console.warn('⚠️  Firebase credentials not found in .env file.');
  console.warn('   Server will start but API calls requiring Firebase will fail.');
  console.warn('   Please configure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL in .env');
}

module.exports = { admin, db, auth, firebaseReady };
