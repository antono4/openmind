//! Context management module for OPEN MIND AI
//! 
//! Manages conversation context and history for seamless interactions.

use std::collections::HashMap;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use crate::token_juice::Token;

/// Context entry representing a conversation context
#[derive(Debug, Clone)]
pub struct ContextEntry {
    pub id: String,
    pub tokens: Vec<Token>,
    pub created_at: DateTime<Utc>,
    pub last_accessed: DateTime<Utc>,
    pub priority: f64,
}

impl ContextEntry {
    pub fn new(tokens: Vec<Token>) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            tokens,
            created_at: now,
            last_accessed: now,
            priority: 1.0,
        }
    }
}

/// ContextManager handles conversation context and history
pub struct ContextManager {
    contexts: HashMap<String, ContextEntry>,
    access_order: Vec<String>,
    max_contexts: usize,
}

impl ContextManager {
    /// Create a new ContextManager
    pub fn new() -> Self {
        Self {
            contexts: HashMap::new(),
            access_order: Vec::new(),
            max_contexts: 1000,
        }
    }

    /// Create with custom max contexts
    pub fn with_max_contexts(max: usize) -> Self {
        Self {
            contexts: HashMap::new(),
            access_order: Vec::new(),
            max_contexts: max,
        }
    }

    /// Get or create context for given tokens
    pub fn get_context(&mut self, tokens: &[Token]) -> ContextEntry {
        // Try to find existing context with similar tokens
        let context_key = self.generate_context_key(tokens);
        
        if let Some(existing) = self.contexts.get_mut(&context_key) {
            existing.last_accessed = Utc::now();
            existing.priority = (existing.priority * 1.1).min(10.0);
            return existing.clone();
        }

        // Create new context
        let entry = ContextEntry::new(tokens.to_vec());
        let id = entry.id.clone();
        
        // Evict old contexts if needed
        self.evict_if_needed();
        
        self.contexts.insert(id.clone(), entry.clone());
        self.access_order.push(id);
        
        entry
    }

    /// Generate a context key from tokens
    fn generate_context_key(&self, tokens: &[Token]) -> String {
        let token_values: Vec<_> = tokens.iter().map(|t| t.value.clone()).collect();
        Uuid::new_v5(&Uuid::NAMESPACE_DNS, token_values.join(" ").as_bytes())
            .to_string()
    }

    /// Evict least recently used contexts if over limit
    fn evict_if_needed(&mut self) {
        while self.contexts.len() >= self.max_contexts && !self.access_order.is_empty() {
            if let Some(oldest_id) = self.access_order.first().cloned() {
                if self.contexts.remove(&oldest_id).is_some() {
                    self.access_order.remove(0);
                }
            }
        }
    }

    /// Get context by ID
    pub fn get_by_id(&self, id: &str) -> Option<ContextEntry> {
        self.contexts.get(id).cloned()
    }

    /// Remove a context
    pub fn remove(&mut self, id: &str) -> bool {
        if self.contexts.remove(id).is_some() {
            self.access_order.retain(|i| i != id);
            return true;
        }
        false
    }

    /// Get total context count
    pub fn len(&self) -> usize {
        self.contexts.len()
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.contexts.is_empty()
    }

    /// Clear all contexts
    pub fn clear(&mut self) {
        self.contexts.clear();
        self.access_order.clear();
    }
}

impl Default for ContextManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_context_creation() {
        let mut manager = ContextManager::new();
        let tokens = vec![
            Token {
                token_type: crate::token_juice::TokenType::Word,
                value: "Hello".to_string(),
                position: 0,
                length: 5,
            }
        ];
        
        let context = manager.get_context(&tokens);
        assert!(!context.id.is_empty());
        assert_eq!(manager.len(), 1);
    }

    #[test]
    fn test_context_eviction() {
        let mut manager = ContextManager::with_max_contexts(2);
        
        for i in 0..5 {
            let tokens = vec![
                Token {
                    token_type: crate::token_juice::TokenType::Word,
                    value: format!("Word{}", i),
                    position: 0,
                    length: 5,
                }
            ];
            manager.get_context(&tokens);
        }
        
        assert!(manager.len() <= 2);
    }

    #[test]
    fn test_context_clear() {
        let mut manager = ContextManager::new();
        let tokens = vec![
            Token {
                token_type: crate::token_juice::TokenType::Word,
                value: "Test".to_string(),
                position: 0,
                length: 4,
            }
        ];
        
        manager.get_context(&tokens);
        assert!(!manager.is_empty());
        
        manager.clear();
        assert!(manager.is_empty());
    }
}