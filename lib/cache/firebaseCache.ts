import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBINwJWO7b9nd2vf2oK-KLLKNry5q3dPak",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "geoair-monitor.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://geoair-monitor-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "geoair-monitor",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "geoair-monitor.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "331339670214",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:331339670214:web:6362245d87f67114d42dc7",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-LZWRTZHKLP",
};

// Initialize Firebase App safely (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const database = getDatabase(app);

// In-memory fallback cache for instant response if database is slow or offline
const memoryCache = new Map<string, { data: any; expiry: number }>();

function sanitizeKey(key: string): string {
  // Firebase Realtime DB keys cannot contain '.', '#', '$', '[', or ']'
  return key.replace(/[.#$\[\]]/g, "_");
}

export class FirebaseCache {
  private defaultTTL = 15 * 60 * 1000; // 15 minutes TTL

  async get<T>(key: string): Promise<T | null> {
    const safeKey = sanitizeKey(key);
    const now = Date.now();

    // 1. Check in-memory cache first (ultra-fast)
    const mem = memoryCache.get(safeKey);
    if (mem && mem.expiry > now) {
      return mem.data as T;
    }

    // 2. Check Firebase Realtime Database with a strict 2s timeout
    try {
      const dbPromise = (async () => {
        const snapshot = await get(ref(database, `cache/${safeKey}`));
        if (snapshot.exists()) {
          const record = snapshot.val();
          if (record && record.timestamp && now - record.timestamp < (record.ttlMs || this.defaultTTL)) {
            // Update memory cache
            memoryCache.set(safeKey, {
              data: record.data,
              expiry: record.timestamp + (record.ttlMs || this.defaultTTL),
            });
            return record.data as T;
          }
        }
        return null;
      })();

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
      return await Promise.race([dbPromise, timeoutPromise]);
    } catch (e) {
      console.warn("[FirebaseCache] Cache get error (transparent fallback):", e);
      return null;
    }
  }

  async set<T>(key: string, data: T, ttlMinutes: number = 15): Promise<void> {
    const safeKey = sanitizeKey(key);
    const ttlMs = ttlMinutes * 60 * 1000;
    const now = Date.now();

    // Set in-memory cache
    memoryCache.set(safeKey, { data, expiry: now + ttlMs });

    // Set in Firebase Realtime Database asynchronously
    try {
      await set(ref(database, `cache/${safeKey}`), {
        data,
        timestamp: now,
        ttlMs,
      });
    } catch (e) {
      console.warn("[FirebaseCache] Cache set error (transparent fallback):", e);
    }
  }
}

export const firebaseCache = new FirebaseCache();
