# Contributing to OPEN MIND AI

Thank you for your interest in contributing to OPEN MIND AI! 

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment details

### Suggesting Features

1. Search for existing feature requests
2. Create a new issue with:
   - Clear description of the feature
   - Use cases
   - Any mockups or examples if applicable

### Pull Requests

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes
4. Write/update tests as needed
5. Ensure all tests pass:
   ```bash
   pnpm test
   ```
6. Commit with clear messages
7. Push and create a PR

## Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/openmind.git
cd openmind

# Add upstream remote
git remote add upstream https://github.com/original/openmind.git

# Install dependencies
pnpm install

# Create a feature branch
git checkout -b feature/my-feature
```

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Avoid `any` type
- Use explicit return types for functions
- Follow existing naming conventions

### Rust
- Run `cargo fmt` before committing
- Ensure `cargo clippy` passes
- Write unit tests for new functionality

### General
- Keep functions small and focused
- Write meaningful comments
- Use consistent naming

## Commit Messages

Use clear, descriptive commit messages:
- Start with a verb (Add, Fix, Update, Remove)
- Be specific about what changed
- Reference issues when applicable

Examples:
- `Add memory search functionality`
- `Fix token processing overflow`
- `Update UI components for better accessibility`

## Testing

All new features should include tests:
- Unit tests for utilities
- Integration tests for components
- E2E tests for critical flows

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage
```

## Questions?

Feel free to:
- Open an issue for questions
- Join our community discussions
- Reach out to maintainers

Thank you for making OPEN MIND AI better! 🚀