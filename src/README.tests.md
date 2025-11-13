# Test Suite

This document describes the test suite for code-review-ai.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Test Files

### `src/dsl/git.test.ts` - Git DSL Tests

Tests the Git DSL implementation including:
- **File Parsing**: Correctly categorizes files as modified/created/deleted
- **fileMatch()**: Glob pattern matching for files
- **hasChanges()**: Checking if patterns match any changed files
- **Commit History**: Parsing commit metadata

**Key Test Cases:**
- Files with both insertions and deletions → modified_files
- Files with only insertions → created_files
- Files with only deletions → deleted_files
- Glob patterns like `src/**/*.ts` correctly match files
- Empty diffs are handled gracefully

### `src/dsl/functions.test.ts` - DSL Functions Tests

Tests the global review functions that collect results:
- **message()**: Non-blocking informational messages
- **warn()**: Warnings that don't block the review
- **fail()**: Blocking failures that cause review to fail
- **markdown()**: Custom markdown content for PR comments

**Key Test Cases:**
- Each function collects results with correct properties (message, file, line)
- Multiple calls accumulate results
- `fail()` sets `hasFailures()` to true
- Results can be formatted for terminal and markdown
- Results collector can be reset

### `src/engine/evaluator.test.ts` - Evaluator Tests

Tests the main orchestration engine:
- **Evaluator Initialization**: Creating evaluators with different options
- **ReviewFile Loading**: Finding and validating reviewfiles
- **Results Collection**: Collecting results during evaluation
- **Exit Codes**: Returning correct exit codes (0 for success, 1 for failures)
- **DSL Context Creation**: Building review context with Git/GitHub DSL
- **Error Handling**: Gracefully handling reviewfile errors

**Key Test Cases:**
- Evaluator accepts custom base branches
- GitHub DSL is optional (enabled/disabled)
- Exit code 0 when no failures, 1 when failures exist
- Reviewfile must export default async function
- Results are reset before each evaluation

## Test Utilities

### Mocking

- **simple-git** is mocked in git.test.ts to avoid real git operations
- Mock data simulates realistic diff summaries and commit histories

### Test Structure

Each test file follows the pattern:
1. **describe()** blocks group related tests
2. **beforeEach()** sets up fresh state (e.g., reset results collector)
3. **it()** tests individual behaviors
4. **expect()** assertions verify behavior

## Code Coverage

To generate coverage reports:

```bash
# Run tests with coverage
npx vitest run --coverage

# Coverage reports will be in ./coverage/
```

Coverage configuration is in `vitest.config.ts`:
- **include**: All source files in `src/**/*.ts`
- **exclude**: Test files, CLI entry point, command files

## CI/CD Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

## Writing New Tests

When adding new features:

1. **Create test file** alongside the implementation (e.g., `feature.ts` → `feature.test.ts`)
2. **Import vitest utilities**: `import { describe, it, expect, beforeEach, vi } from "vitest"`
3. **Group related tests** using `describe()` blocks
4. **Use beforeEach()** to set up clean state
5. **Mock external dependencies** (file system, git, GitHub API)
6. **Test both success and error paths**

Example:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { myFunction } from "./myFeature.js";

describe("myFeature", () => {
  beforeEach(() => {
    // Reset state
  });

  it("should handle normal case", () => {
    const result = myFunction("input");
    expect(result).toBe("expected");
  });

  it("should handle edge case", () => {
    const result = myFunction("");
    expect(result).toBe("default");
  });
});
```

## Best Practices

1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Use descriptive test names** - "should parse modified files correctly"
3. **Keep tests isolated** - Each test should be independent
4. **Mock external dependencies** - Don't make real API calls or git operations
5. **Test error cases** - Don't just test the happy path
6. **Reset state between tests** - Use beforeEach() to ensure clean slate
