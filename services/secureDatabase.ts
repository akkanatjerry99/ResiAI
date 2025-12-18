
import { Patient } from '../types';
import { MOCK_PATIENTS } from '../constants';

const DB_NAME = 'ResiFlow_Secure_DB';
const DB_VERSION = 2; // Bump version to force upgrade and cleaning
const STORE_NAME = 'patients_enc';
const META_STORE = 'meta';

export class SecureDatabase {
  private db: IDBDatabase | null = null;
  private key: CryptoKey | null = null;

  /**
   * Initialize the DB and derive the crypto key from the user's PIN.
   */
  async initialize(pin: string): Promise<boolean> {
    try {
      // Open DB first so we can access the Salt stored inside
      this.db = await this.openDB();
      this.key = await this.deriveKey(pin);
      return true;
    } catch (e) {
      console.error("Failed to init secure DB", e);
      return false;
    }
  }

  /**
   * Get all patients, decrypting them on the fly.
   * If DB is empty, seed it with MOCK_PATIENTS (encrypted).
   */
  async getAllPatients(): Promise<Patient[]> {
    if (!this.db || !this.key) throw new Error("DB not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = async () => {
        const encryptedRecords = request.result;
        
        if (encryptedRecords.length === 0) {
          // Seed DB
          console.log("Seeding database with encrypted mock data...");
          try {
            await this.seedDatabase();
            // Re-fetch after seeding
            const transaction2 = this.db!.transaction([STORE_NAME], 'readonly');
            const store2 = transaction2.objectStore(STORE_NAME);
            const req2 = store2.getAll();
            req2.onsuccess = async () => {
                const recs = req2.result;
                try {
                    const decrypted = (await Promise.all(
                        recs.map(async (r: any) => {
                            try {
                                return await this.decrypt(r.ciphertext, r.iv);
                            } catch (e) {
                                console.warn("Failed to decrypt seed record", e);
                                return null;
                            }
                        })
                    )).filter((p): p is Patient => p !== null);
                    resolve(decrypted.sort((a,b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime()));
                } catch (e) {
                    reject(e);
                }
            };
            req2.onerror = () => reject(req2.error);
          } catch (e) {
            reject(e);
          }
          return;
        }

        try {
          // Attempt to decrypt all records. 
          const decryptedResults = await Promise.all(
            encryptedRecords.map(async (record: any) => {
               try {
                   return await this.decrypt(record.ciphertext, record.iv);
               } catch (e) {
                   console.warn("Failed to decrypt record", record.id, e);
                   return null; 
               }
            })
          );

          // Filter out failed decryptions
          const validPatients = decryptedResults.filter((p): p is Patient => p !== null);
          
          // If we have records but failed to decrypt ALL of them (likely salt mismatch or wrong PIN)
          if (validPatients.length === 0 && encryptedRecords.length > 0) {
              // Check if these are likely mock records (p1, p2, p3...)
              // If so, this is likely a dev environment salt mismatch. Auto-heal.
              const isMockData = encryptedRecords.some((r: any) => ['p1', 'p2', 'p3'].includes(r.id));
              
              if (isMockData) {
                  console.warn("Corrupted mock data detected (Salt mismatch?). Auto-healing database...");
                  
                  // 1. Wipe the store
                  const wipeTx = this.db!.transaction([STORE_NAME], 'readwrite');
                  wipeTx.objectStore(STORE_NAME).clear();
                  
                  await new Promise<void>((resolveWipe) => {
                      wipeTx.oncomplete = () => resolveWipe();
                      wipeTx.onerror = () => resolveWipe();
                  });

                  // 2. Re-seed with current key
                  await this.seedDatabase();
                  
                  // 3. Return the fresh mock patients directly to avoid another round trip delay
                  resolve(MOCK_PATIENTS.sort((a,b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime()));
                  return;
              }

              // If it's real data that failed, we can't auto-heal without data loss, so throw error.
              // This prompts the "Wrong Password?" message.
              reject(new Error("Decryption failed for all records. Wrong PIN?"));
          } else {
              // Sort by admission date desc
              resolve(validPatients.sort((a,b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime()));
          }
        } catch (error) {
          console.error("Critical Decryption Error", error);
          reject(error);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save or Update a single patient (encrypts before saving).
   */
  async savePatient(patient: Patient): Promise<void> {
    if (!this.db || !this.key) throw new Error("DB not initialized");

    const { ciphertext, iv } = await this.encrypt(patient);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id: patient.id, ciphertext, iv });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Nuke the database. Recovery option.
   */
  async resetDatabase(): Promise<void> {
      if (this.db) {
          this.db.close();
      }
      return new Promise((resolve, reject) => {
          const req = indexedDB.deleteDatabase(DB_NAME);
          req.onsuccess = () => {
              console.log("Database reset.");
              resolve();
          };
          req.onerror = () => {
              console.error("Failed to delete DB");
              reject(req.error);
          };
          req.onblocked = () => {
              console.warn("Delete DB blocked");
          };
      });
  }

  /**
   * Change User PIN
   * Decrypts everything with old PIN (current key), re-encrypts with new PIN, saves back.
   */
  async changePin(newPin: string): Promise<boolean> {
      if (!this.db || !this.key) return false;

      // 1. Get all current data decrypted
      let allPatients: Patient[] = [];
      try {
          allPatients = await this.getAllPatients();
      } catch (e) {
          console.error("Cannot change PIN: current data inaccessible", e);
          return false;
      }

      // 2. Generate NEW Salt and store it in DB
      const newSaltBytes = window.crypto.getRandomValues(new Uint8Array(16));
      
      const saltTx = this.db.transaction([META_STORE], 'readwrite');
      saltTx.objectStore(META_STORE).put(newSaltBytes, 'salt');
      await new Promise<void>(resolve => { saltTx.oncomplete = () => resolve() });

      const encoder = new TextEncoder();
      const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(newPin),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );

      this.key = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: newSaltBytes,
          iterations: 100000,
          hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );

      // 3. Clear Patient DB and re-save with new key
      const clearTx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = clearTx.objectStore(STORE_NAME);
      store.clear();

      await new Promise<void>((resolve) => {
          clearTx.oncomplete = () => resolve();
      });

      // 4. Save all (will use new this.key)
      for (const p of allPatients) {
          await this.savePatient(p);
      }

      return true;
  }

  /**
   * Restore from Backup JSON
   * Wipes current DB and replaces with content of JSON (encrypting it).
   */
  async restoreFromBackup(patients: Patient[]): Promise<void> {
      if (!this.db || !this.key) throw new Error("DB not initialized");

      // 1. Clear existing
      const clearTx = this.db.transaction([STORE_NAME], 'readwrite');
      clearTx.objectStore(STORE_NAME).clear();
      await new Promise<void>(resolve => { clearTx.oncomplete = () => resolve() });

      // 2. Encrypt and save all
      for (const p of patients) {
          await this.savePatient(p);
      }
  }

  /**
   * Bulk save (useful for seeding).
   */
  private async seedDatabase(): Promise<void> {
    if (!this.db || !this.key) throw new Error("DB not initialized");
    
    // Encrypt all mock patients
    const encryptedData = await Promise.all(MOCK_PATIENTS.map(p => this.encrypt(p)));

    return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        encryptedData.forEach((enc, index) => {
            store.put({ id: MOCK_PATIENTS[index].id, ciphertext: enc.ciphertext, iv: enc.iv });
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
  }

  // --- CRYPTO HELPERS ---

  private async getSalt(): Promise<Uint8Array> {
      if (!this.db) throw new Error("DB closed");
      return new Promise((resolve, reject) => {
          const tx = this.db!.transaction([META_STORE], 'readwrite');
          const store = tx.objectStore(META_STORE);
          const req = store.get('salt');
          
          req.onsuccess = () => {
              if (req.result) {
                  resolve(req.result);
              } else {
                  // Generate new salt if missing
                  const newSalt = window.crypto.getRandomValues(new Uint8Array(16));
                  store.put(newSalt, 'salt');
                  resolve(newSalt);
              }
          };
          req.onerror = () => reject(req.error);
      });
  }

  private async deriveKey(pin: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(pin),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    // Fetch Salt from DB (Robust persistence vs LocalStorage)
    const salt = await this.getSalt();

    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  private async encrypt(data: any): Promise<{ ciphertext: ArrayBuffer, iv: Uint8Array }> {
    if (!this.key) throw new Error("No Key");
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      this.key,
      encodedData
    );

    return { ciphertext, iv };
  }

  private async decrypt(ciphertext: ArrayBuffer, iv: any): Promise<any> {
    if (!this.key) throw new Error("No Key");
    
    // Robust IV Handling: IndexedDB can serialize Uint8Array weirdly
    let safeIv: Uint8Array;
    
    if (iv instanceof Uint8Array) {
        safeIv = iv;
    } else if (Array.isArray(iv)) {
        safeIv = new Uint8Array(iv);
    } else if (typeof iv === 'object' && iv !== null) {
        safeIv = new Uint8Array(Object.values(iv));
    } else {
        throw new Error("Invalid IV format encountered in DB");
    }

    try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: safeIv },
          this.key,
          ciphertext
        );

        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedBuffer));
    } catch (e) {
        throw e;
    }
  }

  // --- DB HELPERS ---

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create patients store if needed
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        } else {
            // If upgrading from V1 -> V2, the old salt (localStorage) is unreliable in this flow.
            // Safest to clear the store to prevent decryption errors and allow re-seeding.
            const transaction = (event.target as IDBOpenDBRequest).transaction;
            if (transaction) {
               console.warn("DB Upgrade: Clearing old data store to ensure salt consistency.");
               transaction.objectStore(STORE_NAME).clear();
            }
        }

        // Create meta store for Salt persistence
        if (!db.objectStoreNames.contains(META_STORE)) {
            db.createObjectStore(META_STORE);
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }
}

export const secureDB = new SecureDatabase();
