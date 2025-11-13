# Code Review AI Examples

This directory contains working examples and templates for creating your own review rules.

## 📁 Files

- **`reviewfile.ts`** - Complete working example with common patterns
- **`reviewfile-basic.ts`** - Minimal starter template
- **`reviewfile-strict.ts`** - Strict enforcement with more rules
- **`reviewfile-relaxed.ts`** - Gentle suggestions without blocking

## 🚀 Quick Start

### 1. Copy Example to Your Project

```bash
# Copy the complete example
cp examples/reviewfile.ts ./reviewfile.ts

# Or start with the basic template
cp examples/reviewfile-basic.ts ./reviewfile.ts
```

### 2. Customize Rules

Edit `reviewfile.ts` to match your team's needs:

```typescript
import { warn, fail, message } from "velvet";

export default async function (review) {
  // Add your custom rules here
  if (review.git.fileMatch("package.json").edited.length > 0) {
    warn("Dependencies changed - update CHANGELOG");
  }
}
```

### 3. Test Locally

Test your rules against local changes:

```bash
# Test against main branch
velvet local

# Test against different base
velvet local --base develop

# Verbose output for debugging
velvet local --verbose
```

### 4. Add to CI/CD

Create `.github/workflows/code-review.yml`:

```yaml
name: Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v3
        with:
          node-version: "18"

      - run: npm install
      - run: npm install -g velvet

      - run: velvet run --post
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 📚 Common Patterns

### Check PR Size

```typescript
const totalChanges = review.git.diffs.reduce(
  (sum, diff) => sum + diff.additions + diff.deletions,
  0
);

if (totalChanges > 500) {
  warn(`Large PR: ${totalChanges} lines changed`);
}
```

### Require Tests

```typescript
const appFiles = review.git.fileMatch("src/**/*.ts");
const testFiles = review.git.fileMatch("**/*.test.ts");

if (appFiles.edited.length > 0 && testFiles.edited.length === 0) {
  fail("App changes require test updates");
}
```

### Check CHANGELOG

```typescript
const hasSourceChanges = review.git.hasChanges("src/**/*");
const hasChangelog = review.git.fileMatch("CHANGELOG.md").edited.length > 0;

if (hasSourceChanges && !hasChangelog) {
  warn("Update CHANGELOG.md");
}
```

### Check Package Dependencies

```typescript
const pkgChanged = review.git.fileMatch("package.json").edited.length > 0;
const lockChanged = review.git.fileMatch("package-lock.json").edited.length > 0;

if (pkgChanged && !lockChanged) {
  fail("Run npm install to update lock file");
}
```

### Check PR Title (GitHub)

```typescript
if (review.github && !review.github.pr.title.match(/^(feat|fix|docs):/)) {
  warn("PR title should follow: feat|fix|docs: description");
}
```

### File Content Checks

```typescript
import * as fs from "fs";

const tsFiles = review.git.fileMatch("**/*.ts");

for (const file of tsFiles.edited) {
  const content = fs.readFileSync(file, "utf-8");

  if (content.includes("console.log")) {
    warn(`Remove console.log from ${file}`, file);
  }

  if (content.includes("TODO") && content.includes("FIXME")) {
    message(`File has TODOs: ${file}`, file);
  }
}
```

### Check File Size

```typescript
git.diffs.forEach(diff => {
  if (diff.changes > 200) {
    warn(`Large file changed: ${diff.file} (${diff.changes} lines)`, diff.file);
  }
});
```

### Custom Markdown Summary

```typescript
markdown(`
## 📋 Review Summary

**Files:** ${review.git.modified_files.length} modified
**Lines:** +${pr.additions} -${pr.deletions}
**Author:** @${pr.author.login}

---
Looking good! 🎉
`);
```

## 🎯 Rule Categories

### Blocking Rules (fail)

Use `fail()` for critical issues that **must** be fixed:

- Missing required tests
- Breaking changes without documentation
- Security issues
- Lock file out of sync

### Warnings (warn)

Use `warn()` for issues that **should** be addressed:

- Large PRs
- Missing CHANGELOG updates
- Code style issues
- Potential debugging code

### Informational (message)

Use `message()` for non-blocking info:

- PR statistics
- Helpful tips
- Acknowledgments

## 🔧 Advanced Patterns

### Conditional Rules

```typescript
// Only check tests on weekdays
const isWeekend = new Date().getDay() % 6 === 0;
if (!isWeekend && appFiles.edited.length > 0) {
  // Check tests
}

// Only strict checks for production files
const prodFiles = review.git.fileMatch("**/prod/**");
if (prodFiles.edited.length > 0) {
  // Extra strict rules
}
```

### Team-Specific Rules

```typescript
// Different rules for different teams
const isFrontend = review.git.hasChanges("src/frontend/**");
const isBackend = review.git.hasChanges("src/backend/**");

if (isFrontend) {
  // Frontend-specific rules
  const hasStorybook = review.git.fileMatch("**/*.stories.tsx").edited.length > 0;
  if (!hasStorybook) {
    warn("Consider adding Storybook stories for UI changes");
  }
}

if (isBackend) {
  // Backend-specific rules
  const hasApiDocs = review.git.fileMatch("docs/api/**").edited.length > 0;
  if (!hasApiDocs) {
    warn("Update API documentation for backend changes");
  }
}
```

### Integration with External Tools

```typescript
import { execSync } from "child_process";

// Run custom linter
try {
  execSync("npm run lint:custom", { encoding: "utf-8" });
  message("✓ Custom linting passed");
} catch (error) {
  warn("Custom linter found issues");
}

// Check bundle size
const bundleSize = execSync("npm run build:size", { encoding: "utf-8" });
if (parseInt(bundleSize) > 1000000) {
  warn(`Bundle size increased: ${bundleSize} bytes`);
}
```

## 🐛 Debugging Tips

### Test Specific Files

```bash
# Create a test branch with changes
git checkout -b test-review
git commit -am "test: trigger review"

# Run review
velvet local --verbose
```

### Check What Files Match

```typescript
const matched = review.git.fileMatch("src/**/*.ts");
console.log("Matched files:", matched.edited);
```

### Use Verbose Logging

```typescript
if (process.env.DEBUG) {
  console.log("Git modified:", review.git.modified_files);
  console.log("Git created:", review.git.created_files);
  console.log("Commits:", review.git.commits);
}
```

## 📖 API Reference

### Review Object

```typescript
review.git.modified_files: string[]
review.git.created_files: string[]
review.git.deleted_files: string[]
review.git.commits: GitCommit[]
review.git.diffs: GitDiff[]
review.git.fileMatch(pattern: string): FileMatch
review.git.hasChanges(pattern: string): boolean

review.github?.pr: GitHubPR
review.github?.reviews: GitHubReview[]
review.github?.comments: GitHubComment[]
```

### Functions

```typescript
message(text: string, file?: string, line?: number)
warn(text: string, file?: string, line?: number)
fail(text: string, file?: string, line?: number)
markdown(content: string)
```

## 🎓 Best Practices

1. **Start Simple** - Begin with a few basic rules, add more over time
2. **Test Locally** - Always test new rules with `velvet local`
3. **Be Helpful** - Provide actionable suggestions, not just complaints
4. **Use Warnings Wisely** - Reserve `fail()` for critical issues
5. **Document Rules** - Add comments explaining why each rule exists
6. **Review the Rules** - Periodically review and update rules as your team evolves

## 🔗 Resources

- [Full Documentation](../README.md)
- [DSL API Reference](../README.md#dsl-api-reference)
- [GitHub Actions Setup](../README.md#github-actions-setup)

## 💡 Need Help?

- Check existing examples in this directory
- Run `velvet --help` for CLI options
- Open an issue on GitHub
