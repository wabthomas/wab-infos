
export type OfflineOperation = { id: string; owner: string; kind: 'in' | 'out' | 'prestation' | 'absence'; startDate?: string; endDate?: string; category?: string; recordedAt: string; date?: string; description?: string };
const DB = 'redaction-rh-offline-v1';
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('operations', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, resolve: (value: T) => void, reject: (error: unknown) => void) => void): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction('operations', mode);
    let value: T;
    let ready = false;
    tx.oncomplete = () => { db.close(); if (ready) resolve(value); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
    run(tx.objectStore('operations'), (v) => { value = v; ready = true; }, reject);
  });
}
export function pending(owner: string): Promise<OfflineOperation[]> {
  return transaction('readonly', (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as OfflineOperation[]).filter((op) => op.owner === owner).sort((a,b) => a.recordedAt.localeCompare(b.recordedAt)));
    request.onerror = () => reject(request.error);
  });
}
export function enqueue(op: OfflineOperation): Promise<void> {
  return transaction('readwrite', (store, resolve, reject) => {
    const request = store.put(op);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
export function remove(id: string): Promise<void> {
  return transaction('readwrite', (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
export const offlineOwner = (id: number, email: string) => `${id}:${email.toLowerCase()}`;
export function notifyQueue() { window.dispatchEvent(new Event('rh-offline-queue')); }
