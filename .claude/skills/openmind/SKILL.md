```markdown
# openmind Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `openmind` TypeScript codebase. You will learn how to structure files, write imports and exports, follow commit message conventions, and write tests in alignment with the repository's standards.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `userProfile.ts`, `dataManager.test.ts`

### Import Style
- Use **relative imports** for referencing local modules.
  - Example:
    ```typescript
    import { fetchData } from './apiClient';
    ```

### Export Style
- Use **named exports** for all exported members.
  - Example:
    ```typescript
    // In userProfile.ts
    export function getUserProfile(id: string) { ... }
    ```

### Commit Messages
- Follow the **Conventional Commits** style.
- Use the `feat` prefix for new features.
  - Example:
    ```
    feat: add user authentication module
    ```

## Workflows

### Feature Development
**Trigger:** When adding a new feature or module  
**Command:** `/feature-development`

1. Create a new TypeScript file using camelCase naming.
2. Write code using relative imports and named exports.
3. Write or update corresponding test files (`*.test.ts`).
4. Commit changes using the `feat` prefix and a concise description.

### Writing Tests
**Trigger:** When adding or updating tests  
**Command:** `/write-tests`

1. Create a test file named with the `.test.` infix (e.g., `userProfile.test.ts`).
2. Write tests for your module or function.
3. Run the test suite (framework unknown; use your preferred runner).
4. Ensure all tests pass before committing.

### Committing Changes
**Trigger:** When ready to commit code  
**Command:** `/commit-changes`

1. Stage your changes.
2. Write a commit message using the Conventional Commits format, starting with `feat:`.
3. Keep the message concise (average 43 characters).
4. Push your commit to the repository.

## Testing Patterns

- Test files are named with the `.test.` infix (e.g., `moduleName.test.ts`).
- The testing framework is not specified; use your preferred TypeScript-compatible test runner.
- Place tests alongside the modules they cover for easy discovery.

## Commands
| Command              | Purpose                                         |
|----------------------|-------------------------------------------------|
| /feature-development | Start a new feature following repo conventions  |
| /write-tests         | Add or update tests for a module                |
| /commit-changes      | Commit code using the correct message format    |
```