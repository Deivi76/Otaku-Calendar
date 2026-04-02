import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface AnimeCatalogDB extends DBSchema {
  anime_catalog: {
    key: string;
    value: {
      data: unknown;
      timestamp: number;
    };
  };
  anime_schedule: {
    key: string;
    value: {
      data: unknown;
      timestamp: number;
    };
  };
  anime_updates: {
    key: string;
    value: {
      data: unknown;
      timestamp: number;
    };
  };
}

const DB_NAME = 'otaku-calendar-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AnimeCatalogDB>> | null = null;

async function getDB(): Promise<IDBPDatabase<AnimeCatalogDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AnimeCatalogDB>(DB_NAME, DB_VERSION, {
      upgrade(db: IDBPDatabase<AnimeCatalogDB>) {
        if (!db.objectStoreNames.contains('anime_catalog')) {
          db.createObjectStore('anime_catalog');
        }
        if (!db.objectStoreNames.contains('anime_schedule')) {
          db.createObjectStore('anime_schedule');
        }
        if (!db.objectStoreNames.contains('anime_updates')) {
          db.createObjectStore('anime_updates');
        }
      },
    });
  }
  return dbPromise;
}

const CACHE_DURATION = 60 * 60 * 1000;

export function isDataFresh(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

export async function getFromIndexedDB<T>(store: 'anime_catalog' | 'anime_schedule' | 'anime_updates'): Promise<{ data: T | null; timestamp: number } | null> {
  try {
    const db = await getDB();
    const result = await db.get(store, 'data');
    if (result) {
      return {
        data: result.data as T,
        timestamp: result.timestamp,
      };
    }
    return null;
  } catch (error) {
    console.error(`Error getting from IndexedDB (${store}):`, error);
    return null;
  }
}

export async function saveToIndexedDB<T>(
  store: 'anime_catalog' | 'anime_schedule' | 'anime_updates',
  data: T
): Promise<boolean> {
  try {
    const db = await getDB();
    await db.put(store, {
      data,
      timestamp: Date.now(),
    }, 'data');
    return true;
  } catch (error) {
    console.error(`Error saving to IndexedDB (${store}):`, error);
    return false;
  }
}

export async function clearIndexedDB(store: 'anime_catalog' | 'anime_schedule' | 'anime_updates'): Promise<boolean> {
  try {
    const db = await getDB();
    await db.clear(store);
    return true;
  } catch (error) {
    console.error(`Error clearing IndexedDB (${store}):`, error);
    return false;
  }
}
