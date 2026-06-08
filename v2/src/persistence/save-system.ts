import type { PlayerProfile, RunState } from '@/types/progression';
import type { LLMConfig } from '@/types/ai';
import { createDefaultProfile } from '@/progression/meta-unlocks';

const DB_NAME = 'texas_philosopher_v2';
const DB_VERSION = 1;
const STORE_PROFILE = 'profile';
const STORE_RUN = 'current_run';
const STORE_LLM = 'llm_config';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROFILE)) {
        db.createObjectStore(STORE_PROFILE);
      }
      if (!db.objectStoreNames.contains(STORE_RUN)) {
        db.createObjectStore(STORE_RUN);
      }
      if (!db.objectStoreNames.contains(STORE_LLM)) {
        db.createObjectStore(STORE_LLM);
      }
    };

    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };

    req.onerror = () => reject(req.error);
  });
}

export async function saveProfile(profile: PlayerProfile): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILE, 'readwrite');
    tx.objectStore(STORE_PROFILE).put(profile, 'main');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadProfile(): Promise<PlayerProfile> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILE, 'readonly');
    const req = tx.objectStore(STORE_PROFILE).get('main');
    req.onsuccess = () => resolve(req.result || createDefaultProfile());
    req.onerror = () => reject(req.error);
  });
}

export async function saveRun(run: RunState | null): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RUN, 'readwrite');
    if (run) {
      tx.objectStore(STORE_RUN).put(run, 'current');
    } else {
      tx.objectStore(STORE_RUN).delete('current');
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadRun(): Promise<RunState | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RUN, 'readonly');
    const req = tx.objectStore(STORE_RUN).get('current');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLLMConfig(config: LLMConfig): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LLM, 'readwrite');
    tx.objectStore(STORE_LLM).put(config, 'main');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadLLMConfig(): Promise<LLMConfig | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LLM, 'readonly');
    const req = tx.objectStore(STORE_LLM).get('main');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  const stores = [STORE_PROFILE, STORE_RUN, STORE_LLM];
  for (const store of stores) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
