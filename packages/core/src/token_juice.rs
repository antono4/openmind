//! Token Juice - Token Management Module
//! 
//! Implements efficient tokenization without traditional token limits.
//! Uses optimized algorithms for maximum throughput.

use std::collections::HashMap;

/// Token types for OPEN MIND AI
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum TokenType {
    Word,
    Number,
    Punctuation,
    Whitespace,
    Special,
}

/// A token representation
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Token {
    pub token_type: TokenType,
    pub value: String,
    pub position: usize,
    pub length: usize,
}

/// Tokenizer configuration
#[derive(Debug, Clone)]
pub struct TokenizerConfig {
    pub max_token_length: usize,
    pub enable_optimization: bool,
    pub case_sensitive: bool,
}

impl Default for TokenizerConfig {
    fn default() -> Self {
        Self {
            max_token_length: 1024,
            enable_optimization: true,
            case_sensitive: false,
        }
    }
}

/// TokenJuice - Efficient token management without limits
pub struct TokenJuice {
    config: TokenizerConfig,
    vocabulary: HashMap<String, u64>,
    token_cache: HashMap<String, Vec<Token>>,
}

impl TokenJuice {
    /// Create a new TokenJuice instance
    pub fn new() -> Self {
        Self {
            config: TokenizerConfig::default(),
            vocabulary: HashMap::new(),
            token_cache: HashMap::new(),
        }
    }

    /// Create with custom configuration
    pub fn with_config(config: TokenizerConfig) -> Self {
        Self {
            config,
            vocabulary: HashMap::new(),
            token_cache: HashMap::new(),
        }
    }

    /// Tokenize input text - simple word-based tokenization
    pub fn tokenize(&self, input: &str) -> Vec<Token> {
        let cache_key = input.to_string();
        
        if let Some(cached) = self.token_cache.get(&cache_key) {
            return cached.clone();
        }

        let mut tokens = Vec::new();
        let mut position = 0;

        // Simple word-based tokenization
        let mut current_word = String::new();
        let mut word_start = 0;

        for (i, c) in input.char_indices() {
            if c.is_whitespace() {
                if !current_word.is_empty() {
                    tokens.push(Token {
                        token_type: self.classify_word(&current_word),
                        value: current_word.clone(),
                        position: word_start,
                        length: current_word.len(),
                    });
                    current_word.clear();
                }
                position = i + c.len_utf8();
            } else {
                if current_word.is_empty() {
                    word_start = i;
                }
                current_word.push(c);
            }
        }

        // Don't forget the last word
        if !current_word.is_empty() {
            tokens.push(Token {
                token_type: self.classify_word(&current_word),
                value: current_word,
                position: word_start,
                length: current_word.len(),
            });
        }

        tokens
    }

    /// Classify a word into a token type
    fn classify_word(&self, word: &str) -> TokenType {
        let first_char = word.chars().next().unwrap_or(' ');
        
        if first_char.is_ascii_digit() {
            TokenType::Number
        } else if first_char.is_alphabetic() {
            TokenType::Word
        } else if first_char.is_ascii_punctuation() {
            TokenType::Punctuation
        } else {
            TokenType::Special
        }
    }

    /// Optimize tokens for processing (no token limit)
    pub fn optimize(&self, tokens: &[Token]) -> Vec<Token> {
        if !self.config.enable_optimization {
            return tokens.to_vec();
        }

        tokens
            .iter()
            .filter(|t| t.token_type != TokenType::Whitespace)
            .cloned()
            .collect()
    }

    /// Get vocabulary frequency for a token
    pub fn get_frequency(&self, token: &str) -> u64 {
        *self.vocabulary.get(token).unwrap_or(&0)
    }

    /// Update vocabulary with new tokens
    pub fn update_vocabulary(&mut self, tokens: &[Token]) {
        for token in tokens {
            *self.vocabulary.entry(token.value.clone()).or_insert(0) += 1;
        }
    }

    /// Calculate total token count
    pub fn count_tokens(&self, input: &str) -> usize {
        self.tokenize(input).len()
    }

    /// Get unique token count
    pub fn unique_tokens(&self, input: &str) -> usize {
        let tokens = self.tokenize(input);
        let unique: std::collections::HashSet<_> = tokens.iter().map(|t| &t.value).collect();
        unique.len()
    }
}

impl Default for TokenJuice {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenize_simple() {
        let tj = TokenJuice::new();
        let tokens = tj.tokenize("Hello World");
        assert_eq!(tokens.len(), 2);
        assert_eq!(tokens[0].value, "Hello");
        assert_eq!(tokens[1].value, "World");
    }

    #[test]
    fn test_tokenize_numbers() {
        let tj = TokenJuice::new();
        let tokens = tj.tokenize("123 456");
        assert_eq!(tokens.len(), 2);
        assert_eq!(tokens[0].value, "123");
        assert_eq!(tokens[1].value, "456");
    }

    #[test]
    fn test_optimize() {
        let tj = TokenJuice::new();
        let tokens = tj.tokenize("Hello World");
        let optimized = tj.optimize(&tokens);
        assert_eq!(optimized.len(), 2);
    }

    #[test]
    fn test_token_count() {
        let tj = TokenJuice::new();
        let count = tj.count_tokens("Hello World");
        assert_eq!(count, 2);
    }
}