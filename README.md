# 🤖 Code Review AI

Automated code review CLI tool with a powerful DSL for defining custom review rules. Inspired by Danger.js but designed specifically for code review automation in any CI/CD environment.

## ✨ Features

- **🎯 Flexible Rule System** - Write review rules in TypeScript with a simple, powerful DSL
- **🔍 Git Integration** - Analyze diffs, commits, and file changes
- **🐙 GitHub Support** - Post review comments directly to PRs
- **🚀 CI/CD Ready** - Works with GitHub Actions, GitLab CI, CircleCI, Jenkins, and more
- **📝 Local Testing** - Test your rules locally before pushing
- **⚡ Fast & Lightweight** - Minimal dependencies, quick execution
- **🎨 Customizable** - Create rules that match your team's workflow

## 🚀 Quick Start

### 1. Install

```bash
npm install -g velvet
```

Or use locally in your project:

```bash
npm install --save-dev velvet
```

### 2. Initialize

```bash
cd your-project
velvet init
```

This creates a `reviewfile.ts` with starter rules:

```typescript
import { warn, fail, message, markdown } from "velvet";

export default async function(review) {
  // Check PR size
  const totalChanges = review.git.diffs.reduce(
    (sum, diff) => sum + diff.additions + diff.deletions,
    0
  );

  if (totalChanges > 500) {
    warn(`Large PR: ${totalChanges} lines changed`);
  }

  // Require tests for new code
  const newCode = review.git.created_files.filter(
    f => f.endsWith(".ts") && !f.includes("test")
  );
  const newTests = review.git.created_files.filter(
    f => f.includes("test.")
  );

  if (newCode.length > 0 && newTests.length === 0) {
    fail("New code requires tests");
  }
}
```

### 3. Test Locally

```bash
velvet local
```

This runs your rules against local git changes (compared to `main` branch) and shows results in your terminal.

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
      - run: npx velvet run --post
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Done! Your code reviews are now automated.

## 📖 Usage

### Commands

#### `velvet init`

Initialize velvet in your project:

```bash
# Use basic template
velvet init

# Use strict template (more rules)
velvet init --template strict

# Use relaxed template (fewer rules)
velvet init --template relaxed

# Overwrite existing files
velvet init --force
```

Creates:
- `reviewfile.ts` - Your review rules
- `.env.example` - Environment variable template

#### `velvet local`

Test your rules locally against git changes:

```bash
# Compare against main branch (default)
velvet local

# Compare against different branch
velvet local --base develop

# Verbose output for debugging
velvet local --verbose

# Use custom reviewfile
velvet local --reviewfile ./custom-rules.ts
```

**Exit codes:**
- `0` - Review passed (no failures)
- `1` - Review failed (has blocking failures)

Perfect for pre-commit hooks!

#### `velvet run`

Run review for GitHub PRs (CI/CD mode):

```bash
# Auto-detect GitHub Actions environment
velvet run --post

# Explicit PR specification
velvet run --owner myorg --repo myrepo --pr 123

# Preview without posting
velvet run --dry-run

# Run without posting to GitHub
velvet run --no-post
```

**Environment Variables:**
- `GITHUB_TOKEN` - Required for posting comments
- `GITHUB_REPOSITORY` - Auto-detected in GitHub Actions
- `GITHUB_PR_NUMBER` - Auto-detected in GitHub Actions

## 📝 Writing Review Rules

Review rules are written in TypeScript with access to a powerful DSL.

### Basic Structure

```typescript
import { warn, fail, message, markdown } from "velvet";

export default async function(review) {
  // Your rules here
}
```

### Available Objects

#### `review.git` - Git Information

```typescript
// Changed files
review.git.modified_files  // ["src/app.ts", "src/utils.ts"]
review.git.created_files   // ["src/new.ts"]
review.git.deleted_files   // ["src/old.ts"]

// Commits
review.git.commits         // [{ sha, author, date, message }]

// Diffs
review.git.diffs          // [{ file, additions, deletions, changes }]

// File matching with globs
const tsFiles = review.git.fileMatch("src/**/*.ts");
tsFiles.edited    // ["src/app.ts"]
tsFiles.created   // ["src/new.ts"]
tsFiles.deleted   // ["src/old.ts"]

// Check for changes
if (review.git.hasChanges("package.json")) {
  message("Dependencies changed");
}
```

#### `review.github` - GitHub PR Information (optional)

```typescript
if (review.github) {
  const pr = review.github.pr;

  pr.number          // 123
  pr.title           // "feat: add new feature"
  pr.body            // PR description
  pr.author.login    // "username"
  pr.additions       // 150
  pr.deletions       // 50
  pr.changed_files   // 10

  // Reviews and comments
  review.github.reviews   // [{ user, body, state }]
  review.github.comments  // [{ user, body, path, line }]
}
```

### Review Functions

#### `message()` - Informational (non-blocking)

```typescript
message("All tests passed!");
message("Large file detected", "src/big.ts");
message("Check line 42", "src/app.ts", 42);
```

#### `warn()` - Warning (non-blocking)

```typescript
warn("PR is large, consider splitting");
warn("Missing CHANGELOG update");
warn("Potential issue", "src/utils.ts", 123);
```

#### `fail()` - Failure (blocking, exits with code 1)

```typescript
fail("Tests are required for new code");
fail("Lock file out of sync");
fail("Critical issue", "src/api.ts", 55);
```

#### `markdown()` - Custom markdown content

```typescript
markdown(`
## 📊 Review Summary

**Files Changed:** ${review.git.modified_files.length}
**Author:** @${review.github?.pr.author.login}

Everything looks good! 🎉
`);
```

### Common Patterns

#### Check PR Size

```typescript
const totalChanges = review.git.diffs.reduce(
  (sum, diff) => sum + diff.additions + diff.deletions,
  0
);

if (totalChanges > 500) {
  warn(`Large PR: ${totalChanges} lines. Consider splitting.`);
}
```

#### Require Tests

```typescript
const appFiles = review.git.fileMatch("src/**/*.ts");
const testFiles = review.git.fileMatch("**/*.test.ts");

if (appFiles.edited.length > 0 && testFiles.edited.length === 0) {
  fail("App changes require test updates");
}
```

#### Check CHANGELOG

```typescript
const hasSourceChanges = review.git.hasChanges("src/**/*");
const hasChangelog = review.git.fileMatch("CHANGELOG.md").edited.length > 0;

if (hasSourceChanges && !hasChangelog) {
  warn("Update CHANGELOG.md");
}
```

#### Verify Lock Files

```typescript
const pkgChanged = review.git.fileMatch("package.json").edited.length > 0;
const lockChanged = review.git.fileMatch("package-lock.json").edited.length > 0;

if (pkgChanged && !lockChanged) {
  fail("Run npm install to update lock file");
}
```

#### Check PR Title Format

```typescript
if (review.github && !review.github.pr.title.match(/^(feat|fix|docs):/)) {
  warn("PR title should follow: feat|fix|docs: description");
}
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
# GitHub Personal Access Token (required for posting comments)
GITHUB_TOKEN=ghp_your_token_here

# Optional: Default base branch
DEFAULT_BASE_BRANCH=main
```

**Getting a GitHub Token:**
1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `write:discussion`
4. Copy token to `.env` file

### Multiple Reviewfiles

You can maintain different reviewfiles for different purposes:

```bash
# Strict review for production branches
velvet local --reviewfile ./reviewfile-strict.ts

# Relaxed review for feature branches
velvet local --reviewfile ./reviewfile-relaxed.ts
```

## 🏗️ CI/CD Integration

### GitHub Actions

```yaml
name: Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Important!

      - uses: actions/setup-node@v3
        with:
          node-version: "18"

      - run: npm install
      - run: npx velvet run --post
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### GitLab CI

```yaml
code_review:
  stage: review
  image: node:18
  script:
    - npm install
    - npm install -g velvet
    - velvet local
  only:
    - merge_requests
```

### CircleCI

```yaml
version: 2.1
jobs:
  review:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      - run: npm install
      - run: npx velvet local
```

See [docs/ci-integration.md](./docs/ci-integration.md) for more examples.

## 📚 Documentation

- **[Writing Rules Guide](./docs/writing-rules.md)** - Complete guide to writing custom rules
- **[CI Integration Examples](./docs/ci-integration.md)** - Platform-specific CI/CD setup
- **[Examples Directory](./examples/)** - Working examples and templates
- **[Test Suite Documentation](./src/README.tests.md)** - How to run and write tests

## 🎯 Examples

Check out the `examples/` directory for:

- **[reviewfile.ts](./examples/reviewfile.ts)** - Complete working example with 7+ rules
- **[README.md](./examples/README.md)** - Patterns and API reference
- **Templates** - Basic, strict, and relaxed starter templates

## 🛠️ Development

### From Source

```bash
# Clone and install
git clone https://github.com/yourusername/velvet
cd velvet
npm install

# Build
npm run build

# Link globally (optional)
npm link

# Run tests
npm test

# Run in watch mode
npm run test:watch
```

### Project Structure

```
velvet/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── index.ts            # Main library exports
│   ├── commands/           # CLI commands (init, local, run)
│   ├── dsl/                # DSL framework
│   │   ├── types.ts        # TypeScript interfaces
│   │   ├── git.ts          # Git operations (simple-git)
│   │   ├── github.ts       # GitHub API (Octokit)
│   │   ├── functions.ts    # warn, fail, message, markdown
│   │   └── index.ts        # DSL exports
│   └── engine/             # Evaluation engine
│       ├── evaluator.ts    # Main orchestration
│       ├── loader.ts       # Reviewfile loading
│       └── results.ts      # Results collection
├── examples/               # Example reviewfiles
├── templates/              # Starter templates
├── docs/                   # Documentation
├── dist/                   # Compiled output
└── package.json
```

### Tech Stack

- **Runtime**: Node.js (ESM)
- **Language**: TypeScript
- **CLI Framework**: Commander.js
- **Git Operations**: simple-git
- **GitHub API**: Octokit (@octokit/rest)
- **File Matching**: micromatch
- **Terminal UI**: Chalk, Ora
- **Testing**: Vitest

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality (`npm test`)
5. Ensure all tests pass
6. Commit your changes (`git commit -m 'feat: add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details

## 🙏 Credits

Inspired by [Danger.js](https://danger.systems) - the original automated code review tool.

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/velvet/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/velvet/discussions)
- **Documentation**: [docs/](./docs/)

---

Made with ❤️ for better code reviews
