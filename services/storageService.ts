import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { StudyMaterial, QuizSession } from '../types';

interface SmartTutorDB extends DBSchema {
  materials: {
    key: string;
    value: Omit<StudyMaterial, 'imageBase64'> & { imageBase64?: string };
    indexes: { 'by-date': number };
  };
  images: {
    key: string; // materialId
    value: Blob;
  };
  sessions: {
    key: string;
    value: QuizSession;
    indexes: { 'by-material': string; 'by-date': number };
  };
}

const DB_NAME = 'smarttutor-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<SmartTutorDB> | null = null;

async function getDB(): Promise<IDBPDatabase<SmartTutorDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<SmartTutorDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Materials store
      if (!db.objectStoreNames.contains('materials')) {
        const materialStore = db.createObjectStore('materials', { keyPath: 'id' });
        materialStore.createIndex('by-date', 'createdAt');
      }

      // Images store (separate for efficiency)
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images');
      }

      // Sessions store
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionStore.createIndex('by-material', 'materialId');
        sessionStore.createIndex('by-date', 'createdAt');
      }
    },
  });

  return dbInstance;
}

// Convert base64 to Blob
function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(parts[1] || parts[0]);
  const arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}

// Convert Blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// === Materials ===

export async function getAllMaterials(): Promise<StudyMaterial[]> {
  const db = await getDB();
  const materials = await db.getAllFromIndex('materials', 'by-date');

  // Load images for each material
  const result: StudyMaterial[] = [];
  for (const material of materials.reverse()) { // newest first
    const imageBlob = await db.get('images', material.id);
    const imageBase64 = imageBlob ? await blobToBase64(imageBlob) : '';
    result.push({ ...material, imageBase64 });
  }

  return result;
}

export async function getMaterial(id: string): Promise<StudyMaterial | undefined> {
  const db = await getDB();
  const material = await db.get('materials', id);
  if (!material) return undefined;

  const imageBlob = await db.get('images', id);
  const imageBase64 = imageBlob ? await blobToBase64(imageBlob) : '';
  return { ...material, imageBase64 };
}

export async function saveMaterial(material: StudyMaterial): Promise<void> {
  const db = await getDB();

  // Store image separately as Blob
  const imageBlob = base64ToBlob(material.imageBase64);
  await db.put('images', imageBlob, material.id);

  // Store material without image
  const { imageBase64, ...materialData } = material;
  await db.put('materials', { ...materialData, imageBase64: '' });
}

export async function deleteMaterial(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('materials', id);
  await db.delete('images', id);
}

// === Sessions ===

export async function getAllSessions(): Promise<QuizSession[]> {
  const db = await getDB();
  const sessions = await db.getAllFromIndex('sessions', 'by-date');
  return sessions;
}

export async function getSessionsByMaterial(materialId: string): Promise<QuizSession[]> {
  const db = await getDB();
  return db.getAllFromIndex('sessions', 'by-material', materialId);
}

export async function saveSession(session: QuizSession): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session);
}

export async function deleteSessionsByMaterial(materialId: string): Promise<void> {
  const db = await getDB();
  const sessions = await db.getAllFromIndex('sessions', 'by-material', materialId);
  for (const session of sessions) {
    await db.delete('sessions', session.id);
  }
}

// === Migration from localStorage ===

const OLD_MATERIALS_KEY = 'smart_tutor_materials';
const OLD_SESSIONS_KEY = 'smart_tutor_sessions';

export async function migrateFromLocalStorage(): Promise<boolean> {
  try {
    const oldMaterials = localStorage.getItem(OLD_MATERIALS_KEY);
    const oldSessions = localStorage.getItem(OLD_SESSIONS_KEY);

    if (!oldMaterials && !oldSessions) {
      return false; // Nothing to migrate
    }

    const db = await getDB();

    // Check if already migrated
    const existingMaterials = await db.count('materials');
    if (existingMaterials > 0) {
      // Already have data, clear old localStorage
      localStorage.removeItem(OLD_MATERIALS_KEY);
      localStorage.removeItem(OLD_SESSIONS_KEY);
      return false;
    }

    // Migrate materials
    if (oldMaterials) {
      const materials: StudyMaterial[] = JSON.parse(oldMaterials);
      for (const material of materials) {
        await saveMaterial(material);
      }
    }

    // Migrate sessions
    if (oldSessions) {
      const sessions: QuizSession[] = JSON.parse(oldSessions);
      for (const session of sessions) {
        await saveSession(session);
      }
    }

    // Clear old storage
    localStorage.removeItem(OLD_MATERIALS_KEY);
    localStorage.removeItem(OLD_SESSIONS_KEY);

    console.log('Migration from localStorage completed');
    return true;
  } catch (e) {
    console.error('Migration failed:', e);
    return false;
  }
}

// === Storage info ===

export async function getStorageInfo(): Promise<{ count: number; estimatedSize: string }> {
  const db = await getDB();
  const count = await db.count('materials');

  // Estimate storage usage
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(1);
    return { count, estimatedSize: `${usedMB} MB` };
  }

  return { count, estimatedSize: 'unknown' };
}
