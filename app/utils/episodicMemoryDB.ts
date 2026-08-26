'use client';

export interface MemoryNode {
  id: string;
  fact: string;
  category: 'preference' | 'emotion' | 'relationship' | 'goal';
  valence: 'positive' | 'neutral' | 'vulnerable';
  timestamp: number;
  embedding: number[]; // 64-dim normalized semantic projection vector
}

const DB_NAME = 'EchoCompanionMemory';
const DB_VERSION = 1;
const STORE_NAME = 'episodic_memories';

export class EpisodicMemoryDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB();
    }
  }

  private initDB() {
    if (this.dbPromise) return;
    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Fast Pseudo-Embedding Hash (For 0ms local cosine search without external model download)
  public generateEmbedding(text: string): number[] {
    const vector = new Array(64).fill(0);
    const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);

    words.forEach((word) => {
      for (let i = 0; i < word.length; i++) {
        const charCode = word.charCodeAt(i);
        const index = (charCode * (i + 1) * 31) % 64;
        vector[index] += 1;
      }
    });

    // L2 Normalize
    const magnitude = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0)) || 1;
    return vector.map((val) => val / magnitude);
  }

  // Cosine Similarity between two unit vectors
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    const len = Math.min(vecA.length, vecB.length);
    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
  }

  public async addMemory(
    fact: string,
    category: MemoryNode['category'],
    valence: MemoryNode['valence']
  ): Promise<MemoryNode> {
    this.initDB();
    if (!this.dbPromise) throw new Error('IndexedDB unavailable');
    const db = await this.dbPromise;

    const node: MemoryNode = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fact,
      category,
      valence,
      timestamp: Date.now(),
      embedding: this.generateEmbedding(fact),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(node);
      req.onsuccess = () => resolve(node);
      req.onerror = () => reject(req.error);
    });
  }

  public async retrieveRelevantMemories(query: string, topK: number = 3): Promise<MemoryNode[]> {
    this.initDB();
    if (!this.dbPromise) return [];
    const db = await this.dbPromise;
    const queryEmbedding = this.generateEmbedding(query);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const allMemories: MemoryNode[] = req.result || [];
        const scored = allMemories.map((mem) => ({
          memory: mem,
          score: this.cosineSimilarity(queryEmbedding, mem.embedding || []),
        }));

        scored.sort((a, b) => b.score - a.score);
        resolve(scored.slice(0, topK).map((s) => s.memory));
      };

      req.onerror = () => reject(req.error);
    });
  }

  public async getAllMemories(): Promise<MemoryNode[]> {
    this.initDB();
    if (!this.dbPromise) return [];
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async clearAllMemories(): Promise<void> {
    this.initDB();
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const memoryDB = new EpisodicMemoryDB();
