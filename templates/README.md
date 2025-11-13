# Reviewfile Templates

This directory contains starter templates for creating your own code review rules.

## 📁 Available Templates

### `reviewfile-starter.ts`

A minimal, well-commented starter template with essential rules:
- PR size checking
- Test requirements for new code
- Package.json change notifications
- Basic summary generation

**Best for:** Most projects getting started with code review automation.

## 🚀 Using Templates

### Option 1: Use the CLI (Recommended)

The easiest way to get started is using the built-in init command:

```bash
# Initialize with basic template (same as reviewfile-starter.ts)
velvet init

# Or choose a different template
velvet init --template strict   # More rules, stricter enforcement
velvet init --template relaxed  # Fewer rules, suggestions only
```

This will create a `reviewfile.ts` in your project root with the selected template.

### Option 2: Copy Manually

You can also copy any template directly:

```bash
# Copy the starter template to your project
cp templates/reviewfile-starter.ts ./reviewfile.ts

# Then customize it for your needs
```

## 📚 Template Comparison

| Template | Rules | Enforcement | Best For |
|----------|-------|-------------|----------|
| **Basic** (starter) | 3-4 common rules | Balanced | Most projects |
| **Strict** | 6+ rules | High (uses `fail()`) | Teams with strict standards |
| **Relaxed** | 2-3 suggestions | Low (uses `message()`) | Open source, learning |

## 🎯 Next Steps

After copying a template:

1. **Customize the rules** to match your team's workflow
2. **Test locally** before committing:
   ```bash
   velvet local
   ```
3. **Add to CI/CD** (see [examples/README.md](../examples/README.md) for setup)
4. **Iterate** - Start simple, add rules as needed

## 💡 Need More Examples?

Check out the [examples directory](../examples/) for:
- **examples/reviewfile.ts** - Complete working example with 7+ rule patterns
- **examples/README.md** - Comprehensive guide with common patterns and API reference

## 🔧 Customization Tips

### Add Your Own Rules

```typescript
// Check for specific file patterns
if (review.git.fileMatch("src/api/**").edited.length > 0) {
  message("API files changed - update documentation");
}

// Team-specific conventions
if (pr?.title && !pr.title.includes("JIRA")) {
  warn("Include JIRA ticket number in PR title");
}

// File content checks
import * as fs from "fs";
const files = review.git.fileMatch("**/*.ts").edited;
for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");
  if (content.includes("console.log")) {
    warn(`Remove console.log from ${file}`, file);
  }
}
```

### Adjust Thresholds

Modify the thresholds in templates to match your preferences:

```typescript
// Change PR size warning threshold
if (totalChanges > 300) {  // Default: 500
  warn(`PR too large: ${totalChanges} lines`);
}

// Adjust file size alerts
git.diffs.forEach(diff => {
  if (diff.changes > 150) {  // Default: varies
    message(`Large file: ${diff.file}`);
  }
});
```

## 📖 Resources

- [Main Documentation](../README.md)
- [Example Reviewfile](../examples/reviewfile.ts)
- [Common Patterns Guide](../examples/README.md)
- Run `velvet --help` for CLI options
