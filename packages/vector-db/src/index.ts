/**
 * OPEN MIND AI - Vector Database
 * 
 * Local vector database for semantic search, embeddings storage,
 * and similarity-based retrieval.
 */

import Database from 'better-sqlite3';

export interface VectorEntry {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface VectorDBConfig {
  path?: string;
  dimension?: number;
  metric?: 'cosine' | 'euclidean' | 'dotproduct';
}

export class VectorDB {
  private db: Database.Database;
  private dimension: number;
  private metric: 'cosine' | 'euclidean' | 'dotproduct';
  private cache: Map<string, VectorEntry>;

  constructor(config: VectorDBConfig = {}) {
    this.db = new Database(config.path || ':memory:');
    this.dimension = config.dimension || 1536;
    this.metric = config.metric || 'cosine';
    this.cache = new Map();
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vectors (
        id TEXT PRIMARY KEY,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS vector_values (
        id TEXT NOT NULL,
        index INTEGER NOT NULL,
        value REAL NOT NULL,
        FOREIGN KEY (id) REFERENCES vectors(id) ON DELETE CASCADE,
        PRIMARY KEY (id, index)
      );
      
      CREATE INDEX IF NOT EXISTS idx_vectors_created ON vectors(created_at);
      CREATE INDEX IF NOT EXISTS idx_vectors_updated ON vectors(updated_at);
    `);
  }

  private generateId(): string {
    return `vec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Calculate cosine similarity
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  // Calculate Euclidean distance
  private euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity;
    
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  // Calculate dot product
  private dotProduct(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  // Calculate similarity/distance based on metric
  private calculateSimilarity(a: number[], b: number[]): number {
    switch (this.metric) {
      case 'cosine':
        return this.cosineSimilarity(a, b);
      case 'euclidean':
        return 1 / (1 + this.euclideanDistance(a, b)); // Convert distance to similarity
      case 'dotproduct':
        return this.dotProduct(a, b);
      default:
        return this.cosineSimilarity(a, b);
    }
  }

  add(vector: number[], metadata: Record<string, unknown> = {}): string {
    const id = this.generateId();
    const now = Date.now();

    // Validate dimension
    if (vector.length !== this.dimension) {
      throw new Error(`Vector dimension mismatch: expected ${this.dimension}, got ${vector.length}`);
    }

    // Insert vector metadata
    const stmt = this.db.prepare(`
      INSERT INTO vectors (id, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, JSON.stringify(metadata), now, now);

    // Insert vector values in batches
    const insertBatch = this.db.transaction((values: number[]) => {
      const insertValue = this.db.prepare(`
        INSERT INTO vector_values (id, index, value) VALUES (?, ?, ?)
      `);
      for (let i = 0; i < values.length; i++) {
        insertValue.run(id, i, values[i]);
      }
    });
    insertBatch(vector);

    // Update cache
    const entry: VectorEntry = { id, vector, metadata, createdAt: now, updatedAt: now };
    this.cache.set(id, entry);

    return id;
  }

  get(id: string): VectorEntry | null {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const metaStmt = this.db.prepare('SELECT * FROM vectors WHERE id = ?');
    const row = metaStmt.get(id) as { id: string; metadata: string; created_at: number; updated_at: number } | undefined;
    
    if (!row) return null;

    const valuesStmt = this.db.prepare('SELECT value FROM vector_values WHERE id = ? ORDER BY index');
    const values = valuesStmt.all(id) as { value: number }[];
    const vector = values.map(v => v.value);

    const entry: VectorEntry = {
      id: row.id,
      vector,
      metadata: JSON.parse(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    this.cache.set(id, entry);
    return entry;
  }

  update(id: string, vector?: number[], metadata?: Record<string, unknown>): boolean {
    const existing = this.get(id);
    if (!existing) return false;

    const now = Date.now();
    const newMetadata = metadata ? { ...existing.metadata, ...metadata } : existing.metadata;

    // Update metadata
    const metaStmt = this.db.prepare(`
      UPDATE vectors SET metadata = ?, updated_at = ? WHERE id = ?
    `);
    metaStmt.run(JSON.stringify(newMetadata), now, id);

    // Update vector values if provided
    if (vector) {
      if (vector.length !== this.dimension) {
        throw new Error(`Vector dimension mismatch: expected ${this.dimension}, got ${vector.length}`);
      }

      // Delete old values and insert new
      const updateVector = this.db.transaction((values: number[]) => {
        this.db.prepare('DELETE FROM vector_values WHERE id = ?').run(id);
        const insertValue = this.db.prepare('INSERT INTO vector_values (id, index, value) VALUES (?, ?, ?)');
        for (let i = 0; i < values.length; i++) {
          insertValue.run(id, i, values[i]);
        }
      });
      updateVector(vector);
    }

    // Clear from cache
    this.cache.delete(id);
    return true;
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM vectors WHERE id = ?');
    const result = stmt.run(id);
    this.db.prepare('DELETE FROM vector_values WHERE id = ?').run(id);
    this.cache.delete(id);
    return result.changes > 0;
  }

  search(query: number[], limit = 10, filter?: (metadata: Record<string, unknown>) => boolean): SearchResult[] {
    if (query.length !== this.dimension) {
      throw new Error(`Query dimension mismatch: expected ${this.dimension}, got ${query.length}`);
    }

    // Get all vectors
    const rows = this.db.prepare('SELECT id, metadata FROM vectors').all() as Array<{ id: string; metadata: string }>;
    
    const results: SearchResult[] = [];

    for (const row of rows) {
      const entry = this.get(row.id);
      if (!entry) continue;

      // Apply filter if provided
      if (filter && !filter(entry.metadata)) continue;

      const similarity = this.calculateSimilarity(query, entry.vector);
      results.push({
        id: entry.id,
        score: similarity,
        metadata: entry.metadata,
      });
    }

    // Sort by similarity (descending)
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  searchByText(
    query: string,
    embeddingFn: (text: string) => Promise<number[]>,
    limit = 10
  ): Promise<SearchResult[]> {
    return embeddingFn(query).then(embedding => this.search(embedding, limit));
  }

  count(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM vectors').get() as { count: number };
    return result.count;
  }

  clear(): void {
    this.db.prepare('DELETE FROM vectors').run();
    this.db.prepare('DELETE FROM vector_values').run();
    this.cache.clear();
  }

  getStats(): {
    count: number;
    dimension: number;
    metric: string;
    totalSize: number;
  } {
    return {
      count: this.count(),
      dimension: this.dimension,
      metric: this.metric,
      totalSize: this.db.prepare('SELECT SUM(LENGTH(metadata)) as size FROM vectors').get() as { size: number }.size || 0,
    };
  }

  close(): void {
    this.db.close();
  }

  // Export all vectors for backup
  export(): VectorEntry[] {
    const rows = this.db.prepare('SELECT id FROM vectors').all() as Array<{ id: string }>;
    return rows.map(row => this.get(row.id)!).filter(Boolean) as VectorEntry[];
  }

  // Import vectors from backup
  import(entries: VectorEntry[]): number {
    let imported = 0;
    for (const entry of entries) {
      try {
        this.add(entry.vector, entry.metadata);
        imported++;
      } catch {
        // Skip duplicates or invalid entries
      }
    }
    return imported;
  }
}

export default VectorDB;