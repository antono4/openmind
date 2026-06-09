//! Processor module for OPEN MIND AI
//! 
//! Handles input processing and response generation.

use serde::{Deserialize, Serialize};

/// Result of processing an input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessResult {
    pub input: String,
    pub tokens_used: usize,
    pub context_id: String,
    pub response: String,
}

/// Processing options
#[derive(Debug, Clone)]
pub struct ProcessOptions {
    pub max_tokens: Option<usize>,
    pub temperature: f32,
    pub top_p: f32,
}

impl Default for ProcessOptions {
    fn default() -> Self {
        Self {
            max_tokens: None,
            temperature: 0.7,
            top_p: 0.9,
        }
    }
}

/// Process input with given options
pub fn process_input(input: &str, _options: ProcessOptions) -> ProcessResult {
    let word_count = input.split_whitespace().count();
    
    ProcessResult {
        input: input.to_string(),
        tokens_used: word_count,
        context_id: uuid::Uuid::new_v4().to_string(),
        response: format!(
            "OPEN MIND processed {} words successfully!",
            word_count
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_input() {
        let result = process_input("Hello World", ProcessOptions::default());
        assert_eq!(result.tokens_used, 2);
    }

    #[test]
    fn test_process_empty() {
        let result = process_input("", ProcessOptions::default());
        assert_eq!(result.tokens_used, 0);
    }
}