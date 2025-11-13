#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import dotenv from "dotenv";
import { reviewCommand } from "./commands/review.js";
import { localCommand } from "./commands/local.js";
import { runCommand } from "./commands/run.js";
import { initCommand } from "./commands/init.js";
import { addRuleCommand } from "./commands/add-rule.js";

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name("velvet")
  .description("AI-powered automated code review CLI")
  .version("0.1.0")
  .addHelpText(
    "after",
    `
Examples:
  # Initialize in your project
  $ velvet init

  # Generate rules with AI
  $ velvet add-rule

  # Test locally before pushing
  $ velvet local

  # Run in CI/CD (GitHub Actions)
  $ velvet run --post

  # Custom reviewfile
  $ velvet local --reviewfile ./custom-rules.ts

  # Different base branch
  $ velvet local --base develop

  # Legacy review command (deprecated, use 'local' instead)
  $ velvet review
`
  );

// Init command - Set up the project
program
  .command("init")
  .description("Initialize velvet in your project")
  .option("--template <type>", "Template to use: basic, strict, relaxed", "basic")
  .option("--force", "Overwrite existing files", false)
  .addHelpText(
    "after",
    `
Examples:
  $ velvet init
  $ velvet init --template strict
  $ velvet init --force

Templates:
  basic   - Good starting point with common rules
  strict  - More rules, stricter enforcement
  relaxed - Fewer rules, more suggestions
`
  )
  .action(initCommand);

// Add Rule command - AI-powered rule generation
program
  .command("add-rule")
  .description("Generate review rules using AI")
  .option("-v, --verbose", "Show detailed output", false)
  .addHelpText(
    "after",
    `
Examples:
  $ velvet add-rule

Interactive Flow:
  1. Describe the rule you want in natural language
  2. AI generates the rule code
  3. Preview and confirm
  4. Rule is added to reviewfile.ts

Requirements:
  - ANTHROPIC_API_KEY environment variable
  - Get your API key from: https://console.anthropic.com/

Example Rules:
  • "warn when PRs are too large"
  • "fail if tests are missing for new code"
  • "check that CHANGELOG is updated"
  • "require conventional commit format in PR title"
`
  )
  .action(addRuleCommand);

// Local command - Test locally
program
  .command("local")
  .description("Run review on local git changes (for testing)")
  .option("-b, --base <branch>", "Base branch to compare against", "main")
  .option("-r, --reviewfile <path>", "Path to reviewfile", "./reviewfile.ts")
  .option("-v, --verbose", "Show detailed output", false)
  .addHelpText(
    "after",
    `
Examples:
  $ velvet local
  $ velvet local --base develop
  $ velvet local --verbose
  $ velvet local --reviewfile ./my-rules.ts

Description:
  The 'local' command runs your review rules against local git changes
  without any GitHub integration. Perfect for testing rules before
  committing or pushing changes.

  Changes are compared against the specified base branch (default: main).
  Results are printed to the terminal with colored output.

  This command always exits with code 1 if there are any failures,
  making it suitable for pre-commit hooks.
`
  )
  .action(localCommand);

// Run command - For CI/CD
program
  .command("run")
  .description("Run review for a GitHub PR (use in CI/CD)")
  .option("--owner <owner>", "GitHub repository owner")
  .option("--repo <repo>", "GitHub repository name")
  .option("--pr <number>", "Pull request number")
  .option("-b, --base <branch>", "Base branch to compare against", "main")
  .option("-r, --reviewfile <path>", "Path to reviewfile", "./reviewfile.ts")
  .option("-v, --verbose", "Show detailed output", false)
  .option("--post", "Post results as PR comment (requires GITHUB_TOKEN)", true)
  .option("--no-post", "Don't post to GitHub, just print locally")
  .option("--dry-run", "Show what would be posted without posting", false)
  .addHelpText(
    "after",
    `
Examples:
  # In GitHub Actions (automatic detection)
  $ velvet run --post

  # Manual with explicit PR
  $ velvet run --owner myorg --repo myrepo --pr 123

  # Dry run to preview comment
  $ velvet run --dry-run

  # Just run without posting
  $ velvet run --no-post

Environment Variables:
  GITHUB_TOKEN       - Required for posting comments
  GITHUB_REPOSITORY  - Auto-detected in GitHub Actions
  GITHUB_PR_NUMBER   - Auto-detected in GitHub Actions
  GITHUB_REF         - Auto-detected in GitHub Actions

GitHub Actions Setup:
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
            node-version: '18'

        - run: npm install

        - run: npx code-velvet run --post
          env:
            GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`
  )
  .action(runCommand);

// Review command (legacy, kept for compatibility)
program
  .command("review")
  .description("Run code review (legacy, prefer 'local' or 'run')")
  .argument(
    "[reviewfile]",
    "Path to reviewfile",
    "./reviewfile.ts"
  )
  .option("-b, --base <branch>", "Base branch to compare against", "main")
  .option("-v, --verbose", "Show detailed output", false)
  .option("--no-github", "Disable GitHub integration")
  .addHelpText(
    "after",
    `
Note: This command is kept for backwards compatibility.
      For new projects, use 'local' or 'run' instead.

  Use 'velvet local' for local testing
  Use 'velvet run' for CI/CD with GitHub
`
  )
  .action(reviewCommand);

// Parse arguments
program.parse();
