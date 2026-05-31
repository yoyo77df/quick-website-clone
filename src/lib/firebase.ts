// Firebase initialization (web SDK)
// Safe to expose: these are public client config keys protected by Firebase Security Rules.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC0yYVrhZKM_VCDLI_EXuBWXcJjkkp6mu4",
  authDomain: "do-you-know-fe718.firebaseapp.com",
  projectId: "do-you-know-fe718",
  storageBucket: "do-you-know-fe718.firebasestorage.app",
  messagingSenderId: "386831264788",
  appId: "1:386831264788:web:1d4089af3eafaa18f68b01",
  measurementId: "G-E7VW0KV2T3",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firestore = getFirestore(firebaseApp);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);
