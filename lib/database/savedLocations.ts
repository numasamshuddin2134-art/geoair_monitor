import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, get, set, remove, push } from "firebase/database";

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

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const database = getDatabase(app);

export interface SavedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  savedAt: string;
  notes?: string;
}

export interface RecentQuery {
  id?: string;
  query: string;
  name: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

// In-memory fallback if Firebase DB has connectivity limits
let localSaved: SavedLocation[] = [
  {
    id: "delhi-default",
    name: "New Delhi, India",
    latitude: 28.6139,
    longitude: 77.2090,
    country: "India",
    savedAt: new Date().toISOString(),
    notes: "High particulate monitoring priority sector",
  },
  {
    id: "tokyo-default",
    name: "Tokyo, Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    country: "Japan",
    savedAt: new Date().toISOString(),
    notes: "Kanto urban environmental reference",
  },
  {
    id: "amazon-default",
    name: "Amazon Basin, Brazil",
    latitude: -3.1190,
    longitude: -60.0217,
    country: "Brazil",
    savedAt: new Date().toISOString(),
    notes: "Thermal fire anomaly surveillance",
  },
];

let localRecent: RecentQuery[] = [];

function sanitizeKey(key: string): string {
  return key.replace(/[.#$\[\]]/g, "_");
}

export class FirebaseLocationsService {
  async getSavedLocations(): Promise<SavedLocation[]> {
    try {
      const dbPromise = (async () => {
        const snapshot = await get(ref(database, "saved_locations"));
        if (snapshot.exists()) {
          const val = snapshot.val();
          return Object.values(val) as SavedLocation[];
        }
        return localSaved;
      })();

      const timeoutPromise = new Promise<SavedLocation[]>((resolve) =>
        setTimeout(() => resolve(localSaved), 2000)
      );
      return await Promise.race([dbPromise, timeoutPromise]);
    } catch {
      return localSaved;
    }
  }

  async saveLocation(loc: Omit<SavedLocation, "savedAt">): Promise<SavedLocation> {
    const full: SavedLocation = {
      ...loc,
      savedAt: new Date().toISOString(),
    };

    localSaved = [full, ...localSaved.filter((l) => l.id !== loc.id)];

    try {
      const safeId = sanitizeKey(loc.id);
      await set(ref(database, `saved_locations/${safeId}`), full);
    } catch (e) {
      console.warn("[FirebaseLocations] Error saving location:", e);
    }

    return full;
  }

  async deleteLocation(id: string): Promise<void> {
    localSaved = localSaved.filter((l) => l.id !== id);
    try {
      const safeId = sanitizeKey(id);
      await remove(ref(database, `saved_locations/${safeId}`));
    } catch (e) {
      console.warn("[FirebaseLocations] Error deleting location:", e);
    }
  }

  async getRecentQueries(limit: number = 8): Promise<RecentQuery[]> {
    try {
      const dbPromise = (async () => {
        const snapshot = await get(ref(database, "recent_queries"));
        if (snapshot.exists()) {
          const val = snapshot.val();
          const items = Object.values(val) as RecentQuery[];
          return items.slice(-limit).reverse();
        }
        return localRecent.slice(-limit).reverse();
      })();

      const timeoutPromise = new Promise<RecentQuery[]>((resolve) =>
        setTimeout(() => resolve(localRecent.slice(-limit).reverse()), 2000)
      );
      return await Promise.race([dbPromise, timeoutPromise]);
    } catch {
      return localRecent.slice(-limit).reverse();
    }
  }

  async logRecentQuery(query: RecentQuery): Promise<void> {
    localRecent.push(query);
    if (localRecent.length > 20) localRecent.shift();

    try {
      const newRef = push(ref(database, "recent_queries"));
      await set(newRef, query);
    } catch (e) {
      console.warn("[FirebaseLocations] Error logging recent query:", e);
    }
  }
}

export const firebaseLocations = new FirebaseLocationsService();
