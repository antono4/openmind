//! OPEN MIND AI - Core Library
//! 
//! An open-source AI assistant without token limitations.
//! Built with Rust for maximum performance and reliability.

pub mod memory;
pub mod token_juice;
pub mod context;
pub mod processor;

use std::sync::Arc;
use parking_lot::RwLock;
use anyhow::Result;

/// OPEN MIND AI Core Engine
/// 
/// Main entry point for the AI processing engine.
/// Handles context management, memory operations, and token optimization.
pub struct OpenMindCore {
    memory: Arc<RwLock<memory::MemoryStore>>,
    context_manager: Arc<context::ContextManager>,
    token_processor: Arc<token_juice::TokenJuice>,
}

impl OpenMindCore {
    /// Create a new OPEN MIND AI core instance
    pub fn new() -> Result<Self> {
        Ok(Self {
            memory: Arc::new(RwLock::new(memory::MemoryStore::new()?)),
            context_manager: Arc::new(context::ContextManager::new()),
            token_processor: Arc::new(token_juice::TokenJuice::new()),
        })
    }

    /// Initialize with custom memory storage path
    pub fn with_path(path: &str) -> Result<Self> {
        Ok(Self {
            memory: Arc::new(RwLock::new(memory::MemoryStore::with_path(path)?)),
            context_manager: Arc::new(context::ContextManager::new()),
            token_processor: Arc::new(token_juice::TokenJuice::new()),
        })
    }

    /// Process input and generate response
    pub fn process(&self, input: &str) -> Result<processor::ProcessResult> {
        let tokens = self.token_processor.tokenize(input);
        let optimized = self.token_processor.optimize(&tokens);
        let context = self.context_manager.get_context(&optimized);
        
        Ok(processor::ProcessResult {
            input: input.to_string(),
            tokens_used: optimized.len(),
            context_id: context.id,
            response: format!("OPEN MIND processed: {} tokens", optimized.len()),
        })
    }

    /// Get memory statistics
    pub fn get_stats(&self) -> memory::MemoryStats {
        self.memory.read().get_stats()
    }

    /// Clear all memory
    pub fn clear_memory(&self) -> Result<()> {
        self.memory.write().clear()
    }
}

impl Default for OpenMindCore {
    fn default() -> Self {
        Self::new().expect("Failed to create OpenMindCore")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_core_creation() {
        let core = OpenMindCore::new();
        assert!(core.is_ok());
    }

    #[test]
    fn test_process() {
        let core = OpenMindCore::new().unwrap();
        let result = core.process("Hello OPEN MIND!");
        assert!(result.is_ok());
        assert_eq!(result.unwrap().tokens_used, 3);
    }
}