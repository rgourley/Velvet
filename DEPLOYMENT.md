# Deployment & Git Workflow Guide

## 🚀 Initial Setup & Deploy to GitHub

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository:
   - Name: `velvet` (or your preferred name)
   - Description: "AI-powered automated code review CLI"
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
3. Click "Create repository"

### Step 2: Connect Local Repository to GitHub

```bash
# Set your Git identity (if not already set)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Add all files
git add .

# Make initial commit
git commit -m "feat: initial commit - Velvet code review CLI with AI rule generation"

# Add GitHub remote (replace with your username/repo)
git remote add origin https://github.com/YOUR_USERNAME/velvet.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## 📝 Daily Git Workflow

### Making Changes

```bash
# 1. Check current status
git status

# 2. See what changed
git diff

# 3. Add specific files
git add src/commands/add-rule.ts
git add README.md

# Or add all changes
git add .

# 4. Commit with descriptive message
git commit -m "feat: add AI-powered rule generation"

# 5. Push to GitHub
git push
```

### Commit Message Convention

Use conventional commits format:

```bash
# Features
git commit -m "feat: add new feature"

# Bug fixes
git commit -m "fix: resolve issue with parsing"

# Documentation
git commit -m "docs: update README with examples"

# Refactoring
git commit -m "refactor: simplify error handling"

# Tests
git commit -m "test: add tests for add-rule command"

# Chores
git commit -m "chore: update dependencies"
```

## 🧪 Testing Workflow

### Before Committing

```bash
# 1. Run tests
npm test

# 2. Check TypeScript types
npm run type-check

# 3. Build the project
npm run build

# 4. Test the CLI locally
node dist/cli.js --help
node dist/cli.js local

# 5. Format code
npm run format
```

### Complete Pre-commit Checklist

```bash
# Run all checks at once
npm test && npm run type-check && npm run build && npm run format

# If all pass, commit
git add .
git commit -m "feat: your change description"
git push
```

## 🔄 Syncing with Remote

### Pull Latest Changes

```bash
# Fetch and merge changes from GitHub
git pull origin main
```

### Handle Merge Conflicts

```bash
# If there are conflicts
git status  # See conflicting files
# Edit files to resolve conflicts
git add .
git commit -m "fix: resolve merge conflicts"
git push
```

## 🌿 Branching Workflow

### Create Feature Branch

```bash
# Create and switch to new branch
git checkout -b feature/ai-improvements

# Make changes, then commit
git add .
git commit -m "feat: improve AI prompt engineering"

# Push branch to GitHub
git push -u origin feature/ai-improvements
```

### Merge Branch

```bash
# Switch back to main
git checkout main

# Merge feature branch
git merge feature/ai-improvements

# Push merged changes
git push

# Delete feature branch (optional)
git branch -d feature/ai-improvements
git push origin --delete feature/ai-improvements
```

## 📦 Publishing to NPM (Optional)

### Prepare for Publishing

1. Update `package.json`:
```json
{
  "name": "velvet",
  "version": "1.0.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/velvet.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/velvet/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/velvet#readme"
}
```

2. Create NPM account: https://www.npmjs.com/signup

3. Login and publish:
```bash
npm login
npm run build
npm publish
```

### Update Version

```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch

# Minor version (1.0.0 -> 1.1.0)
npm version minor

# Major version (1.0.0 -> 2.0.0)
npm version major

# Push version tag
git push --tags
```

## 🔐 Environment Variables

### Never Commit Secrets!

```bash
# .env file is already in .gitignore
# Always use .env.example for templates

# To share environment template:
git add .env.example
git commit -m "docs: update environment variables template"
```

### Team Setup

Team members should:
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/velvet.git
cd velvet

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with their own keys
nano .env  # or use your preferred editor
```

## 🐛 Troubleshooting

### Undo Last Commit (Not Pushed)

```bash
# Keep changes, undo commit
git reset --soft HEAD~1

# Discard changes, undo commit
git reset --hard HEAD~1
```

### Discard Local Changes

```bash
# Discard all local changes
git reset --hard HEAD

# Discard specific file
git checkout -- src/commands/add-rule.ts
```

### View Commit History

```bash
# Simple log
git log --oneline

# Detailed log
git log

# Visual graph
git log --graph --oneline --all
```

## 📊 Useful Git Commands

```bash
# See what changed in last commit
git show

# Compare with remote
git fetch
git diff main origin/main

# See who changed what
git blame src/cli.ts

# Search commit history
git log --grep="add-rule"

# Stash changes temporarily
git stash
git stash pop
```

## 🤝 Collaboration

### Review Pull Requests

```bash
# Fetch PR branch
git fetch origin pull/123/head:pr-123
git checkout pr-123

# Test changes
npm install
npm test
npm run build

# Merge if good
git checkout main
git merge pr-123
git push
```

## 📚 Resources

- **Git Documentation**: https://git-scm.com/doc
- **GitHub Guides**: https://guides.github.com/
- **Conventional Commits**: https://www.conventionalcommits.org/
- **NPM Publishing**: https://docs.npmjs.com/cli/v8/commands/npm-publish

---

**Quick Reference Card**

```bash
# Daily workflow
git status           # Check what changed
git add .            # Stage all changes
git commit -m "..."  # Commit with message
git push             # Push to GitHub

# Testing before commit
npm test             # Run tests
npm run build        # Build project
npm run type-check   # Check types

# Syncing
git pull             # Get latest changes
git fetch            # Fetch without merging
```
