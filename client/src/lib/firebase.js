import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBTQ5h9h0teHhiy3KadiH801MJ127DYp2I",
  authDomain: "zoodevcore.firebaseapp.com",
  projectId: "zoodevcore",
  storageBucket: "zoodevcore.firebasestorage.app",
  messagingSenderId: "250144911259",
  appId: "1:250144911259:web:d73e9b702116814c353b3e",
  measurementId: "G-E4FPW52PL4"
};

export const VAPID_KEY = "BALZLCqtRslJ6wV0-hc5jjmYRMvNzMTkM-qvjus0TbWiYeI7am7J5wUfYMYoWph-X-SMA_0CgZWxvh7KWqEUsM4";

let app = null;
let auth = null;
let messaging = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (error) {
  console.warn('Firebase initialization failed:', error.message);
}

// Setup Phone Auth Recaptcha
export const setupRecaptcha = (containerId = 'recaptcha-container') => {
  if (!auth) return null;

  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      // Ignore if already cleared
    }
    window.recaptchaVerifier = null;
  }

  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => { },
    'expired-callback': () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (e) { }
        window.recaptchaVerifier = null;
      }
    }
  });

  return window.recaptchaVerifier;
};

// Send OTP to phone number
export const sendPhoneOtp = async (phoneNumber, appVerifier) => {
  if (!auth) throw new Error('Firebase Auth chưa được khởi tạo');

  // Format Vietnamese phone numbers to E.164 (+84...)
  let formattedPhone = phoneNumber.trim();
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+84' + formattedPhone.slice(1);
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+84' + formattedPhone;
  }

  const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
  return confirmationResult;
};

export const requestNotificationPermission = async () => {
  try {
    const supported = await isSupported();
    if (!supported || !app) return null;

    messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      return currentToken;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
  }
  return null;
};

export const onForegroundMessage = (callback) => {
  if (!messaging) return () => { };
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

export { app, auth, messaging };




