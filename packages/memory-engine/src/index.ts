/**
 * OPEN MIND AI - Memory Engine
 * 
 * TypeScript memory operations with SQLite persistence.
 * Provides high-performance in-memory and persistent storage.
 */

import Database from 'better-sqlite3';
import type { MemoryEntry, MemoryStats } from '@openmind/shared-types';

export interface MemoryEngineConfig {
  path?: string;
  inMemory?: boolean;
}

export class MemoryEngine {
  private db: Database.Database;
  private cache: Map<string, MemoryEntry>;

  constructor(config: MemoryEngineConfig = {}) {
    if (config.inMemory || !config.path) {
      this.db = new Database(':memory:');
    } else {
      this.db = new Database(config.path);
    }
    this.cache = new Map();
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        accessed_at INTEGER NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 0,
        priority INTEGER NOT NULL DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_memory_key ON memory(key);
      CREATE INDEX IF NOT EXISTS idx_memory_priority ON memory(priority DESC);
    `);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  store(key: string, value: string, priority = 0): string {
    const id = this.generateId();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO memory (id, key, value, metadata, created_at, accessed_at, access_count, priority)
      VALUES (?, ?, ?, '{}', ?, ?, 0, ?)
    `);

    stmt.run(id, key, value, now, now, priority);

    const entry: MemoryEntry = {
      id,
      key,
      value,
      metadata: {},
      createdAt: now,
      accessedAt: now,
      accessCount: 0,
      priority,
    };

    this.cache.set(key, entry);
    return id;
  }

  retrieve(key: string): MemoryEntry | null {
    // Update access statistics
    const now = Date.now();
    this.db.prepare(`
      UPDATE memory SET access_count = access_count + 1, accessed_at = ? WHERE key = ?
    `).run(now, key);

    const stmt = this.db.prepare(`
      SELECT id, key, value, metadata, created_at, accessed_at, access_count, priority
      FROM memory WHERE key = ?
    `);

    const row = stmt.get(key) as {
      id: string;
      key: string;
      value: string;
      metadata: string;
      created_at: number;
      accessed_at: number;
      access_count: number;
      priority: number;
    } | undefined;

    if (!row) return null;

    const entry: MemoryEntry = {
      id: row.id,
      key: row.key,
      value: row.value,
      metadata: JSON.parse(row.metadata),
      createdAt: row.created_at,
      accessedAt: row.accessed_at,
      accessCount: row.access_count,
      priority: row.priority,
    };

    this.cache.set(key, entry);
    return entry;
  }

  search(pattern: string): MemoryEntry[] {
    const stmt = this.db.prepare(`
      SELECT id, key, value, metadata, created_at, accessed_at, access_count, priority
      FROM memory WHERE key LIKE ? OR value LIKE ?
      ORDER BY priority DESC, access_count DESC
    `);

    const searchPattern = `%${pattern}%`;
    const rows = stmt.all(searchPattern, searchPattern) as Array<{
      id: string;
      key: string;
      value: string;
      metadata: string;
      created_at: number;
      accessed_at: number;
      access_count: number;
      priority: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      key: row.key,
      value: row.value,
      metadata: JSON.parse(row.metadata),
      createdAt: row.created_at,
      accessedAt: row.accessed_at,
      accessCount: row.access_count,
      priority: row.priority,
    }));
  }

  delete(key: string): boolean {
    const result = this.db.prepare('DELETE FROM memory WHERE key = ?').run(key);
    this.cache.delete(key);
    return result.changes > 0;
  }

  getStats(): MemoryStats {
    const count = this.db.prepare('SELECT COUNT(*) as count FROM memory').get() as { count: number };
    const size = this.db.prepare('SELECT COALESCE(SUM(LENGTH(value)), 0) as size FROM memory').get() as { size: number };
    const avgAccess = this.db.prepare('SELECT COALESCE(AVG(access_count), 0) as avg FROM memory').get() as { avg: number };
    const oldest = this.db.prepare('SELECT MIN(created_at) as oldest FROM memory').get() as { oldest: number | null };
    const newest = this.db.prepare('SELECT MAX(created_at) as newest FROM memory').get() as { newest: number | null };

    return {
      totalEntries: count.count,
      totalSizeBytes: size.size,
      averageAccessCount: avgAccess.avg,
      oldestEntry: oldest.oldest || undefined,
      newestEntry: newest.newest || undefined,
    };
  }

  clear(): void {
    this.db.prepare('DELETE FROM memory').run();
    this.cache.clear();
  }

  close(): void {
    this.db.close();
  }
}

// Default export
export default MemoryEngine;

// Named exports
export { MemoryEngine };