//! Memory management module for OPEN MIND AI
//! 
//! Provides persistent memory storage using SQLite with
//! advanced query capabilities and memory optimization.

use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use anyhow::Result;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use std::collections::HashMap;

/// Memory entry representing a stored memory item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryEntry {
    pub id: String,
    pub key: String,
    pub value: String,
    pub metadata: HashMap<String, String>,
    pub created_at: DateTime<Utc>,
    pub accessed_at: DateTime<Utc>,
    pub access_count: u64,
    pub priority: u8,
}

/// Memory statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStats {
    pub total_entries: usize,
    pub total_size_bytes: usize,
    pub average_access_count: f64,
    pub oldest_entry: Option<DateTime<Utc>>,
    pub newest_entry: Option<DateTime<Utc>>,
}

/// SQLite-backed memory store
pub struct MemoryStore {
    conn: Connection,
}

impl MemoryStore {
    /// Create a new in-memory store
    pub fn new() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        Self::init_schema(&conn)?;
        Ok(Self { conn })
    }

    /// Create a new store with file persistence
    pub fn with_path(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        Self::init_schema(&conn)?;
        Ok(Self { conn })
    }

    /// Initialize database schema
    fn init_schema(conn: &Connection) -> Result<()> {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS memory (
                id TEXT PRIMARY KEY,
                key TEXT NOT NULL UNIQUE,
                value TEXT NOT NULL,
                metadata TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                accessed_at TEXT NOT NULL,
                access_count INTEGER NOT NULL DEFAULT 0,
                priority INTEGER NOT NULL DEFAULT 0
            )",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_memory_key ON memory(key)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_memory_priority ON memory(priority DESC)",
            [],
        )?;
        Ok(())
    }

    /// Store a new memory entry
    pub fn store(&mut self, key: &str, value: &str) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        self.conn.execute(
            "INSERT INTO memory (id, key, value, metadata, created_at, accessed_at, access_count, priority)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                id,
                key,
                value,
                "{}",
                now.to_rfc3339(),
                now.to_rfc3339(),
                0,
                0
            ],
        )?;
        
        Ok(id)
    }

    /// Retrieve a memory entry by key
    pub fn retrieve(&self, key: &str) -> Result<Option<MemoryEntry>> {
        // Update access statistics
        self.conn.execute(
            "UPDATE memory SET access_count = access_count + 1, accessed_at = ?1 WHERE key = ?2",
            params![Utc::now().to_rfc3339(), key],
        )?;

        let mut stmt = self.conn.prepare(
            "SELECT id, key, value, metadata, created_at, accessed_at, access_count, priority
             FROM memory WHERE key = ?1"
        )?;

        let entry = stmt.query_row(params![key], |row| {
            Ok(MemoryEntry {
                id: row.get(0)?,
                key: row.get(1)?,
                value: row.get(2)?,
                metadata: serde_json::from_str(&row.get::<_, String>(3)?).unwrap_or_default(),
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                accessed_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                access_count: row.get(6)?,
                priority: row.get(7)?,
            })
        }).optional()?;

        Ok(entry)
    }

    /// Search memories by pattern
    pub fn search(&self, pattern: &str) -> Result<Vec<MemoryEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, key, value, metadata, created_at, accessed_at, access_count, priority
             FROM memory WHERE key LIKE ?1 OR value LIKE ?1
             ORDER BY priority DESC, access_count DESC"
        )?;

        let pattern = format!("%{}%", pattern);
        let entries = stmt.query_map(params![pattern], |row| {
            Ok(MemoryEntry {
                id: row.get(0)?,
                key: row.get(1)?,
                value: row.get(2)?,
                metadata: serde_json::from_str(&row.get::<_, String>(3)?).unwrap_or_default(),
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                accessed_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                access_count: row.get(6)?,
                priority: row.get(7)?,
            })
        })?.collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(entries)
    }

    /// Delete a memory entry
    pub fn delete(&self, key: &str) -> Result<bool> {
        let affected = self.conn.execute(
            "DELETE FROM memory WHERE key = ?1",
            params![key],
        )?;
        Ok(affected > 0)
    }

    /// Get memory statistics
    pub fn get_stats(&self) -> MemoryStats {
        let total_entries: usize = self.conn
            .query_row("SELECT COUNT(*) FROM memory", [], |row| row.get(0))
            .unwrap_or(0);
        
        let total_size_bytes: usize = self.conn
            .query_row("SELECT COALESCE(SUM(LENGTH(value)), 0) FROM memory", [], |row| row.get(0))
            .unwrap_or(0);
        
        let average_access_count: f64 = self.conn
            .query_row(
                "SELECT COALESCE(AVG(access_count), 0) FROM memory",
                [],
                |row| row.get(0)
            )
            .unwrap_or(0.0);
        
        let oldest: Option<String> = self.conn
            .query_row("SELECT MIN(created_at) FROM memory", [], |row| row.get(0))
            .ok()
            .flatten();
        
        let newest: Option<String> = self.conn
            .query_row("SELECT MAX(created_at) FROM memory", [], |row| row.get(0))
            .ok()
            .flatten();

        MemoryStats {
            total_entries,
            total_size_bytes,
            average_access_count,
            oldest_entry: oldest.and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc)),
            newest_entry: newest.and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc)),
        }
    }

    /// Clear all memories
    pub fn clear(&self) -> Result<()> {
        self.conn.execute("DELETE FROM memory", [])?;
        Ok(())
    }
}

// Helper trait for optional query results
trait OptionalExt<T> {
    fn optional(self) -> std::result::Result<Option<T>, rusqlite::Error>;
}

impl<T> OptionalExt<T> for std::result::Result<T, rusqlite::Error> {
    fn optional(self) -> std::result::Result<Option<T>, rusqlite::Error> {
        match self {
            Ok(val) => Ok(Some(val)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_memory_store() {
        let mut store = MemoryStore::new().unwrap();
        let id = store.store("test_key", "test_value").unwrap();
        assert!(!id.is_empty());
        
        let entry = store.retrieve("test_key").unwrap();
        assert!(entry.is_some());
        assert_eq!(entry.unwrap().value, "test_value");
    }

    #[test]
    fn test_memory_search() {
        let mut store = MemoryStore::new().unwrap();
        store.store("hello_world", "greeting").unwrap();
        store.store("goodbye", "farewell").unwrap();
        
        let results = store.search("hello").unwrap();
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn test_memory_stats() {
        let store = MemoryStore::new().unwrap();
        let stats = store.get_stats();
        assert_eq!(stats.total_entries, 0);
    }
}