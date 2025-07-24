// src/utils/indexedDB.js
import { openDB } from 'idb';

const DB_NAME = 'qmed-db';
const STORE_NAME = 'pacientes';
const DB_VERSION = 1;

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    }
  });
}

export async function savePacientes(pacientes) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const p of pacientes) {
    tx.store.put(p);
  }
  await tx.done;
}

export async function getAllPacientes() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function deletePacienteIndexed(id) {
  const db = await getDB();
  return db.delete(STORE_NAME, id);
}
