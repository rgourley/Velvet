import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { createSampleReviewFile } from "../engine/loader.js";

interface InitOptions {
  template?: string; // basic, strict, relaxed
  force?: boolean;
}

/**
 * Initialize command - Set up velvet in your project
 */
export async function initCommand(options: InitOptions): Promise<void> {
  console.log(chalk.blue.bold("\n🚀 Initializing Code Review AI\n"));

  const projectRoot = process.cwd();

  try {
    // Step 1: Create reviewfile
    console.log(chalk.cyan("📝 Creating reviewfile.ts..."));
    const reviewFilePath = await createReviewFile(projectRoot, options);
    console.log(chalk.green(`   ✓ Created ${reviewFilePath}`));

    // Step 2: Create .env.example
    console.log(chalk.cyan("\n🔐 Creating .env.example..."));
    const envExamplePath = await createEnvExample(projectRoot, options);
    console.log(chalk.green(`   ✓ Created ${envExamplePath}`));

    // Step 3: Show next steps
    showNextSteps(options.template);
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));

      if (error.message.includes("already exists") && !options.force) {
        console.log(
          chalk.yellow("\n💡 Use --force to overwrite existing files")
        );
      }
    }
    process.exit(1);
  }
}

/**
 * Create reviewfile with selected template
 */
async function createReviewFile(
  projectRoot: string,
  options: InitOptions
): Promise<string> {
  const filePath = path.join(projectRoot, "reviewfile.ts");

  // Check if exists
  if (fs.existsSync(filePath) && !options.force) {
    throw new Error("reviewfile.ts already exists");
  }

  const template = options.template || "basic";
  const content = getReviewFileTemplate(template);

  fs.writeFileSync(filePath, content, "utf-8");
  return "reviewfile.ts";
}

/**
 * Create .env.example file
 */
async function createEnvExample(
  projectRoot: string,
  options: InitOptions
): Promise<string> {
  const filePath = path.join(projectRoot, ".env.example");

  // Check if exists
  if (fs.existsSync(filePath) && !options.force) {
    // Append to existing file
    let content = fs.readFileSync(filePath, "utf-8");

    if (!content.includes("GITHUB_TOKEN")) {
      content +=
        "\n\n# Code Review AI\n" +
        "# Get your token from: https://github.com/settings/tokens\n" +
        "GITHUB_TOKEN=ghp_your_github_personal_access_token\n";

      fs.writeFileSync(filePath, content, "utf-8");
      return ".env.example (updated)";
    }

    return ".env.example (already configured)";
  }

  const content = `# Code Review AI Configuration
# GitHub Personal Access Token
# Required for posting comments to PRs
# Get your token from: https://github.com/settings/tokens
# Scopes needed: repo, write:discussion
GITHUB_TOKEN=ghp_your_github_personal_access_token

# Optional: Custom base branch
# DEFAULT_BASE_BRANCH=main
`;

  fs.writeFileSync(filePath, content, "utf-8");
  return ".env.example";
}

/**
 * Get reviewfile template content based on type
 */
function getReviewFileTemplate(template: string): string {
  switch (template) {
    case "strict":
      return getStrictTemplate();
    case "relaxed":
      return getRelaxedTemplate();
    case "basic":
    default:
      return getBasicTemplate();
  }
}

/**
 * Basic template - Good starting point
 */
function getBasicTemplate(): string {
  return `import { warn, fail, message } from "velvet";

export default async function(review) {
  // Log basic info
  message(\`Reviewing \${review.git.commits.length} commit(s)\`);

  // Check if package.json was modified
  if (review.git.fileMatch("package.json").edited.length > 0) {
    warn("package.json was modified. Did you update the changelog?");
  }

  // Check PR title format (GitHub only)
  if (review.github && !review.github.titleMatches(/^[A-Z]+-\\d+:/)) {
    warn("PR title should start with a ticket number (e.g., PROJ-123: Description)");
  }

  // Check for large PRs
  if (review.git.diffs.length > 50) {
    warn("Large PR detected. Consider breaking it into smaller PRs.");
  }

  // Check if tests were added
  const newCode = review.git.created_files.filter(
    f => (f.endsWith(".ts") || f.endsWith(".js")) && !f.includes("test")
  );
  const newTests = review.git.created_files.filter(
    f => f.includes("test.ts") || f.includes("test.js")
  );

  if (newCode.length > 0 && newTests.length === 0) {
    warn("New code added without tests. Consider adding tests.");
  }
}
`;
}

/**
 * Strict template - More rules, stricter enforcement
 */
function getStrictTemplate(): string {
  return `import { warn, fail, message, markdown } from "velvet";

export default async function(review) {
  // Track stats
  const stats = {
    modified: review.git.modified_files.length,
    created: review.git.created_files.length,
    deleted: review.git.deleted_files.length,
  };

  message(\`📊 Changes: +\${stats.created} ~\${stats.modified} -\${stats.deleted}\`);

  // REQUIRED: PR title must follow convention
  if (review.github && !review.github.titleMatches(/^(feat|fix|docs|chore|test|refactor):/)) {
    fail("PR title must follow conventional commits format: feat|fix|docs|chore|test|refactor: description");
  }

  // REQUIRED: Tests for new code
  const newCode = review.git.created_files.filter(
    f => (f.endsWith(".ts") || f.endsWith(".js")) && !f.includes("test") && !f.includes("spec")
  );
  const newTests = review.git.created_files.filter(
    f => f.includes("test.") || f.includes("spec.")
  );

  if (newCode.length > 0 && newTests.length === 0) {
    fail(\`New code files added (\${newCode.length}) but no tests found. Tests are required.\`);
  }

  // REQUIRED: Changelog updates for source changes
  const hasSourceChanges = review.git.hasChanges("src/**/*");
  const hasChangelog = review.git.fileMatch("CHANGELOG.md").edited.length > 0;

  if (hasSourceChanges && !hasChangelog) {
    fail("Source code changed but CHANGELOG.md was not updated.");
  }

  // WARNING: Large PRs
  if (review.git.diffs.length > 30) {
    warn(\`Large PR with \${review.git.diffs.length} files. Consider breaking into smaller PRs.\`);
  }

  // WARNING: Package changes
  if (review.git.fileMatch("package*.json").edited.length > 0) {
    warn("Package dependencies changed. Ensure lock file is updated and changes are documented.");
  }

  // Add summary markdown
  markdown(\`
## 📋 Review Summary

**Files:** \${stats.created + stats.modified + stats.deleted} total
- ✨ Created: \${stats.created}
- 📝 Modified: \${stats.modified}
- 🗑️ Deleted: \${stats.deleted}

**Commits:** \${review.git.commits.length}
  \`);
}
`;
}

/**
 * Relaxed template - Fewer rules, more suggestions
 */
function getRelaxedTemplate(): string {
  return `import { warn, message, markdown } from "velvet";

export default async function(review) {
  // Welcome message
  message(\`👋 Reviewing \${review.git.commits.length} commit(s) by \${review.github?.pr.author.login || "you"}\`);

  // Gentle suggestions
  if (review.git.fileMatch("package.json").edited.length > 0) {
    message("ℹ️ Dependencies changed. Make sure to run npm install.");
  }

  // Size suggestion
  const totalFiles = review.git.diffs.length;
  if (totalFiles > 100) {
    warn(\`This is a large PR with \${totalFiles} files. Consider if it can be split.\`);
  } else if (totalFiles > 50) {
    message(\`Medium-sized PR with \${totalFiles} files.\`);
  }

  // Test suggestion (not required)
  const newCode = review.git.created_files.filter(
    f => f.endsWith(".ts") || f.endsWith(".js")
  );
  const newTests = review.git.created_files.filter(
    f => f.includes("test") || f.includes("spec")
  );

  if (newCode.length > 5 && newTests.length === 0) {
    message("💡 Consider adding tests for the new code.");
  }

  // Show changed file types
  const fileTypes = new Map<string, number>();
  review.git.getChangedFiles().forEach(file => {
    const ext = file.split(".").pop() || "other";
    fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
  });

  if (fileTypes.size > 0) {
    const types = Array.from(fileTypes.entries())
      .map(([ext, count]) => \`\${ext}: \${count}\`)
      .join(", ");
    message(\`📁 File types: \${types}\`);
  }
}
`;
}

/**
 * Show next steps after initialization
 */
function showNextSteps(template?: string): void {
  console.log(chalk.green.bold("\n✨ Setup complete!\n"));

  console.log(chalk.cyan("📖 Next steps:\n"));

  console.log(chalk.white("1. Review and customize your reviewfile.ts"));
  console.log(
    chalk.gray("   Edit the rules to match your team's workflow\n")
  );

  console.log(chalk.white("2. Test locally:"));
  console.log(chalk.gray("   review-ai local\n"));

  console.log(chalk.white("3. Set up GitHub token:"));
  console.log(chalk.gray("   cp .env.example .env"));
  console.log(
    chalk.gray("   # Edit .env and add your GitHub token from:")
  );
  console.log(chalk.gray("   # https://github.com/settings/tokens\n"));

  console.log(chalk.white("4. Add to GitHub Actions:"));
  console.log(chalk.gray("   Create .github/workflows/code-review.yml:"));
  console.log(
    chalk.gray(`
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
         - run: npm install
         - run: npx velvet run --post
           env:
             GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`)
  );

  console.log(
    chalk.cyan("\n📚 Learn more: https://github.com/yourusername/velvet")
  );

  if (template) {
    console.log(
      chalk.gray(`\n🎨 Template used: ${template}`)
    );
    console.log(
      chalk.gray(
        "   Try other templates: --template basic|strict|relaxed"
      )
    );
  }
}
