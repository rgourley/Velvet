# Writing Review Rules

A comprehensive guide to writing custom review rules for velvet.

## Table of Contents

- [Getting Started](#getting-started)
- [DSL Overview](#dsl-overview)
- [Git DSL](#git-dsl)
- [GitHub DSL](#github-dsl)
- [Review Functions](#review-functions)
- [Common Patterns](#common-patterns)
- [Advanced Techniques](#advanced-techniques)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Creating Your First Reviewfile

A reviewfile is a TypeScript file that exports a default async function:

```typescript
import { warn, fail, message, markdown } from "velvet";

export default async function(review) {
  // Your review logic here
}
```

### The Review Object

The `review` parameter provides access to:

```typescript
interface ReviewDSL {
  git: GitDSL;           // Git metadata and operations
  github?: GitHubDSL;    // GitHub PR metadata (optional)
  isGitHub: boolean;     // True if running in GitHub Actions
  env: Record<string, string>;  // Environment variables
}
```

## DSL Overview

### Available Objects

1. **`review.git`** - Git information (always available)
   - Changed files (modified, created, deleted)
   - Commit history
   - Diff statistics
   - File matching with globs

2. **`review.github`** - GitHub PR information (optional)
   - Pull request metadata
   - Author information
   - Reviews and comments
   - PR statistics

3. **`review.env`** - Environment variables
   - Access to process.env
   - Useful for feature flags or custom configuration

### Review Functions

Four global functions for reporting:

1. **`message(text, file?, line?)`** - Informational, non-blocking
2. **`warn(text, file?, line?)`** - Warning, non-blocking but highlighted
3. **`fail(text, file?, line?)`** - Failure, blocking (exits with code 1)
4. **`markdown(content)`** - Custom markdown for PR comments

## Git DSL

### File Lists

Access changed files categorized by type:

```typescript
// Files with both additions and deletions
review.git.modified_files  // ["src/app.ts", "src/utils.ts"]

// Files with only additions (new files)
review.git.created_files   // ["src/new-feature.ts"]

// Files with only deletions (removed files)
review.git.deleted_files   // ["src/old-code.ts"]
```

### File Matching

Use glob patterns to match files:

```typescript
// Match TypeScript files in src/
const tsFiles = review.git.fileMatch("src/**/*.ts");

tsFiles.edited    // Modified TypeScript files
tsFiles.created   // New TypeScript files
tsFiles.deleted   // Deleted TypeScript files
tsFiles.getAll()  // All changed TypeScript files (edited + created)

// Check if any match
tsFiles.matches("src/**/*.ts")  // true if any TS files changed

// Multiple patterns
const configFiles = review.git.fileMatch([
  "*.json",
  "*.yml",
  "*.yaml"
]);
```

#### Glob Pattern Examples

```typescript
// All files in src/
review.git.fileMatch("src/**/*")

// TypeScript files anywhere
review.git.fileMatch("**/*.ts")

// Test files
review.git.fileMatch("**/*.test.ts")
review.git.fileMatch("**/*.spec.ts")

// Specific file
review.git.fileMatch("package.json")

// Multiple directories
review.git.fileMatch("{src,lib}/**/*.ts")

// Exclude pattern (use negative pattern in array)
review.git.fileMatch("src/**/*.ts", "!src/**/*.test.ts")
```

### hasChanges()

Quick check if any files match a pattern:

```typescript
// Check if package.json changed
if (review.git.hasChanges("package.json")) {
  message("Dependencies may have changed");
}

// Check if any test files changed
if (review.git.hasChanges("**/*.test.ts")) {
  message("Tests were updated");
}
```

### Commits

Access commit history between base and HEAD:

```typescript
interface GitCommit {
  sha: string;        // "abc123def456"
  author: string;     // "John Doe"
  date: Date;         // Date object
  message: string;    // "feat: add new feature"
}

// Iterate through commits
review.git.commits.forEach(commit => {
  console.log(`${commit.author}: ${commit.message}`);
});

// Check commit messages
const hasBreakingChange = review.git.commits.some(c =>
  c.message.includes("BREAKING CHANGE")
);
```

### Diffs

Access detailed diff information:

```typescript
interface GitDiff {
  file: string;       // "src/app.ts"
  additions: number;  // 50
  deletions: number;  // 10
  changes: number;    // 60
}

// Calculate total changes
const totalChanges = review.git.diffs.reduce(
  (sum, diff) => sum + diff.additions + diff.deletions,
  0
);

// Find large files
review.git.diffs.forEach(diff => {
  if (diff.changes > 200) {
    warn(`Large file: ${diff.file} (${diff.changes} lines)`, diff.file);
  }
});
```

## GitHub DSL

The GitHub DSL is only available when running in GitHub Actions with a pull request.

### Pull Request Metadata

```typescript
if (review.github) {
  const pr = review.github.pr;

  // Basic info
  pr.number           // 123
  pr.title            // "feat: add new feature"
  pr.body             // PR description (markdown)
  pr.state            // "open" | "closed"
  pr.html_url         // "https://github.com/..."

  // Statistics
  pr.additions        // 150
  pr.deletions        // 50
  pr.changed_files    // 10

  // Author
  pr.author.login     // "username"
  pr.author.avatar_url
  pr.author.html_url

  // Timestamps
  pr.created_at       // ISO date string
  pr.updated_at
  pr.merged_at        // null if not merged

  // Branches
  pr.base.ref         // "main"
  pr.base.sha         // "abc123..."
  pr.head.ref         // "feature-branch"
  pr.head.sha         // "def456..."
}
```

### Reviews

Access PR reviews:

```typescript
interface GitHubReview {
  id: number;
  user: { login: string };
  body: string;
  state: string;  // "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED"
  submitted_at: string;
}

if (review.github) {
  // Check for approvals
  const approvals = review.github.reviews.filter(
    r => r.state === "APPROVED"
  );

  if (approvals.length === 0) {
    message("⏳ Waiting for approvals");
  }
}
```

### Comments

Access PR comments:

```typescript
interface GitHubComment {
  id: number;
  user: { login: string };
  body: string;
  created_at: string;
  path?: string;      // File path (for line comments)
  line?: number;      // Line number (for line comments)
}

if (review.github) {
  // Count comments
  const commentCount = review.github.comments.length;

  // Find specific mentions
  const hasTodoComment = review.github.comments.some(c =>
    c.body.includes("TODO")
  );
}
```

## Review Functions

### message() - Informational

Non-blocking informational messages:

```typescript
// Simple message
message("Review complete");

// With file
message("Large file detected", "src/big.ts");

// With file and line
message("Consider refactoring", "src/complex.ts", 150);
```

**Use cases:**
- General information
- Statistics and summaries
- Helpful tips
- Acknowledgments

### warn() - Warning

Non-blocking warnings (highlighted in output):

```typescript
// Simple warning
warn("PR is large, consider splitting");

// With file
warn("Missing JSDoc comment", "src/api.ts");

// With file and line
warn("Complex function detected", "src/utils.ts", 42);
```

**Use cases:**
- Best practice violations
- Style issues
- Potential problems
- Recommendations

### fail() - Failure

Blocking failures (causes review to fail):

```typescript
// Simple failure
fail("Tests are required");

// With file
fail("Syntax error detected", "src/broken.ts");

// With file and line
fail("Type error", "src/app.ts", 100);
```

**Use cases:**
- Required tests missing
- Breaking changes without documentation
- Security issues
- Critical errors

**Important:** Use `fail()` sparingly. It will cause CI to fail!

### markdown() - Custom Content

Add custom markdown to PR comments:

```typescript
markdown(`
## 📊 Review Summary

**Files Changed:** ${review.git.modified_files.length}
**Lines Changed:** +${totalAdditions} -${totalDeletions}
**Commits:** ${review.git.commits.length}

### 🎯 Highlights

- ✅ All tests passing
- ✅ Code coverage maintained
- ⚠️ Large PR (consider splitting)

---
*Automated review by velvet*
`);
```

**Use cases:**
- Custom summaries
- Tables and charts
- Links to documentation
- Detailed analysis

## Common Patterns

### 1. Check PR Size

Warn about large PRs:

```typescript
const totalChanges = review.git.diffs.reduce(
  (sum, diff) => sum + diff.additions + diff.deletions,
  0
);

if (totalChanges > 500) {
  warn(`Large PR: ${totalChanges} lines changed. Consider breaking into smaller PRs.`);
} else if (totalChanges > 1000) {
  fail(`Extremely large PR: ${totalChanges} lines. Please split this into multiple PRs.`);
}
```

### 2. Require Tests

Ensure new code has tests:

```typescript
const appFiles = review.git.fileMatch("src/**/*.ts");
const testFiles = review.git.fileMatch("**/*.test.ts");

// Check for edited files
if (appFiles.edited.length > 0 && testFiles.edited.length === 0) {
  warn("App code changed but no tests updated. Consider updating tests.");
}

// Require tests for new files
if (appFiles.created.length > 0 && testFiles.created.length === 0) {
  fail("New source files added without tests. Tests are required.");
}
```

### 3. Check CHANGELOG

Ensure significant changes are documented:

```typescript
const hasSourceChanges = review.git.hasChanges("src/**/*.ts");
const hasChangelog = review.git.fileMatch("CHANGELOG.md").edited.length > 0;

if (hasSourceChanges && !hasChangelog) {
  warn("Source code changed but CHANGELOG.md not updated. Please document your changes.");
}
```

### 4. Verify Lock Files

Ensure dependency lock files are updated:

```typescript
const pkgChanged = review.git.fileMatch("package.json").edited.length > 0;
const lockChanged = review.git.fileMatch("package-lock.json").edited.length > 0;

if (pkgChanged && !lockChanged) {
  fail("package.json changed but package-lock.json not updated. Run 'npm install'.");
}

// Also check for dependency additions
if (pkgChanged) {
  message("📦 Dependencies changed. Ensure changes are documented and tested.");
}
```

### 5. Check PR Title Format

Enforce conventional commit style:

```typescript
if (review.github) {
  const validPrefixes = /^(feat|fix|docs|chore|test|refactor|perf|style)(\(.+\))?:/;

  if (!validPrefixes.test(review.github.pr.title)) {
    warn(
      'PR title should follow conventional commits: "type: description" or "type(scope): description"\\n' +
      'Examples: "feat: add login", "fix(api): handle null values"'
    );
  }
}
```

### 6. Check for Debugging Code

Warn about console.log statements:

```typescript
import * as fs from "fs";

const sourceFiles = review.git.fileMatch("src/**/*.{ts,js}");
const changedFiles = [...sourceFiles.edited, ...sourceFiles.created];

for (const file of changedFiles) {
  try {
    const content = fs.readFileSync(file, "utf-8");

    if (content.includes("console.log")) {
      warn(`Remove console.log statements before merging`, file);
    }

    if (content.includes("debugger")) {
      fail(`Remove debugger statements before merging`, file);
    }
  } catch (error) {
    // File might be deleted or binary
  }
}
```

### 7. Enforce File Naming

Check for naming conventions:

```typescript
const newFiles = review.git.created_files;

newFiles.forEach(file => {
  // PascalCase for components
  if (file.includes("components/")) {
    const filename = file.split("/").pop() || "";
    if (filename[0] !== filename[0].toUpperCase()) {
      warn(`Component files should use PascalCase: ${file}`, file);
    }
  }

  // kebab-case for utilities
  if (file.includes("utils/")) {
    const filename = file.split("/").pop() || "";
    if (filename.includes("_") || filename.match(/[A-Z]/)) {
      warn(`Utility files should use kebab-case: ${file}`, file);
    }
  }
});
```

### 8. Check Documentation

Ensure README is updated for significant changes:

```typescript
const hasFeatureChanges = review.git.hasChanges("src/features/**");
const hasReadmeUpdate = review.git.fileMatch("README.md").edited.length > 0;

if (hasFeatureChanges && !hasReadmeUpdate) {
  message("💡 Consider updating README.md to document new features");
}
```

## Advanced Techniques

### Conditional Rules

Apply different rules based on context:

```typescript
// Different rules for different branches
const isProductionBranch = review.github?.pr.base.ref === "main";
const isFeatureBranch = review.github?.pr.head.ref.startsWith("feature/");

if (isProductionBranch) {
  // Stricter rules for production
  if (totalChanges > 300) {
    fail("PRs to main must be under 300 lines");
  }
} else if (isFeatureBranch) {
  // More relaxed for feature branches
  if (totalChanges > 1000) {
    warn("Feature branch PR is very large");
  }
}

// Different rules for different file types
const frontendChanges = review.git.hasChanges("src/frontend/**");
const backendChanges = review.git.hasChanges("src/backend/**");

if (frontendChanges && backendChanges) {
  warn("PR touches both frontend and backend. Consider splitting.");
}
```

### Team-Specific Rules

```typescript
// Check PR author for specific requirements
if (review.github) {
  const author = review.github.pr.author.login;

  // Junior developers get extra guidance
  const juniorDevs = ["intern1", "intern2"];
  if (juniorDevs.includes(author)) {
    message("👋 Remember to add tests and update documentation!");
  }

  // Require review from specific team members
  const criticalFiles = review.git.fileMatch("src/security/**");
  if (criticalFiles.getAll().length > 0) {
    message("🔒 Security-related changes - ensure @security-team reviews");
  }
}
```

### Integration with External Tools

Run custom linters or tools:

```typescript
import { execSync } from "child_process";

try {
  // Run custom linter
  const output = execSync("npm run lint:custom", { encoding: "utf-8" });
  message("✅ Custom linting passed");
} catch (error: any) {
  if (error.stdout) {
    warn(`Custom linter found issues:\\n${error.stdout}`);
  }
}

// Check bundle size
try {
  const bundleSize = execSync("npm run build:size", { encoding: "utf-8" });
  const sizeInKB = parseInt(bundleSize);

  if (sizeInKB > 1000) {
    warn(`Bundle size increased: ${sizeInKB}KB (max: 1000KB)`);
  }
} catch (error) {
  // Build or size check failed
}
```

### File Content Analysis

Read and analyze file contents:

```typescript
import * as fs from "fs";

// Check for specific patterns
const apiFiles = review.git.fileMatch("src/api/**/*.ts");

for (const file of apiFiles.getAll()) {
  try {
    const content = fs.readFileSync(file, "utf-8");

    // Check for proper error handling
    if (content.includes("fetch(") && !content.includes("try")) {
      warn(`API call without error handling in ${file}`, file);
    }

    // Check for sensitive data
    if (content.match(/api[_-]?key|password|secret/i)) {
      fail(`Possible sensitive data in ${file}. Use environment variables.`, file);
    }
  } catch (error) {
    // File might be binary or deleted
  }
}
```

### Custom Metrics

Calculate and report custom metrics:

```typescript
// Calculate code complexity (simple example)
const tsFiles = review.git.fileMatch("src/**/*.ts");
let totalFunctions = 0;
let totalLines = 0;

for (const file of tsFiles.getAll()) {
  try {
    const content = fs.readFileSync(file, "utf-8");
    totalLines += content.split("\\n").length;
    totalFunctions += (content.match(/function |\\w+\\(/g) || []).length;
  } catch (error) {
    // Ignore
  }
}

markdown(`
### 📈 Code Metrics

- **Total Lines Changed:** ${totalLines}
- **Functions Changed:** ${totalFunctions}
- **Average Lines per Function:** ${Math.round(totalLines / totalFunctions)}
`);
```

## Best Practices

### 1. Start Simple

Begin with a few basic rules and add more over time:

```typescript
// Good: Simple, focused rules
if (review.git.created_files.length > 0) {
  message("New files added - remember to update tests");
}

// Avoid: Complex, hard-to-maintain rules on day one
```

### 2. Use Descriptive Messages

Make messages clear and actionable:

```typescript
// Good: Specific and actionable
fail("Tests required: Add test files for new-feature.ts");

// Bad: Vague
fail("Missing tests");
```

### 3. Reserve fail() for Critical Issues

Use `fail()` sparingly:

```typescript
// Good: Critical issues only
if (hasSecurityVulnerability) {
  fail("Security vulnerability detected");
}

// Bad: Using fail() for style issues
if (hasStyleIssue) {
  fail("Style guide violation");  // Use warn() instead
}
```

### 4. Test Locally

Always test rules locally before committing:

```bash
velvet local --verbose
```

### 5. Document Your Rules

Add comments explaining why rules exist:

```typescript
// RULE: Require CHANGELOG updates for src/ changes
// WHY: Helps track changes and generate release notes
// WHO: Required by product team
if (hasSourceChanges && !hasChangelog) {
  warn("Update CHANGELOG.md");
}
```

### 6. Handle Errors Gracefully

Don't let review failures break the review:

```typescript
try {
  const content = fs.readFileSync(file, "utf-8");
  // ... check content
} catch (error) {
  // File might be binary, deleted, or inaccessible
  // Log error but don't fail the review
  console.error(`Could not read ${file}:`, error);
}
```

### 7. Provide Context

Help reviewers understand issues:

```typescript
warn(
  "Large PR detected (${totalChanges} lines).\\n" +
  "Consider splitting into smaller PRs for easier review.\\n" +
  "See: https://docs.example.com/pull-requests#size-guidelines"
);
```

## Troubleshooting

### Rule Not Triggering

**Check file patterns:**
```typescript
// Debug: Log matched files
const matched = review.git.fileMatch("src/**/*.ts");
console.log("Matched files:", matched.getAll());
```

**Check git status:**
```typescript
// Debug: Check what files git sees
console.log("Modified:", review.git.modified_files);
console.log("Created:", review.git.created_files);
```

### GitHub DSL Not Available

Ensure GitHub integration is enabled:

```typescript
// Always check before accessing
if (review.github) {
  // Use GitHub DSL
} else {
  // GitHub not available (local mode)
  message("Running in local mode - GitHub features unavailable");
}
```

### File Reading Errors

Handle file system errors:

```typescript
import * as path from "path";

try {
  // Use absolute paths
  const filePath = path.resolve(process.cwd(), file);
  const content = fs.readFileSync(filePath, "utf-8");
} catch (error: any) {
  console.error(`Error reading ${file}:`, error.message);
  // Continue review
}
```

### Module Import Errors

Ensure correct import syntax:

```typescript
// ESM syntax (correct)
import { warn, fail, message } from "velvet";
import * as fs from "fs";

// CommonJS (incorrect - will fail)
const { warn, fail } = require("velvet");
```

## Next Steps

- Check out [examples/reviewfile.ts](../examples/reviewfile.ts) for a complete working example
- See [examples/README.md](../examples/README.md) for more patterns
- Read [ci-integration.md](./ci-integration.md) for CI/CD setup
- Test your rules with `velvet local --verbose`

---

Happy reviewing! 🚀
