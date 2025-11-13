/**
 * Example Reviewfile - Complete Working Example
 *
 * This demonstrates common code review patterns and how to use
 * the velvet DSL effectively.
 */

import { warn, fail, message, markdown } from "velvet";

export default async function (review) {
  const pr = review.github?.pr;
  const git = review.git;

  // ============================================================================
  // Rule 1: Check PR Size
  // ============================================================================
  // Large PRs are harder to review. Warn if changes are too big.

  const totalChanges = git.diffs.reduce(
    (sum, diff) => sum + diff.additions + diff.deletions,
    0
  );

  if (totalChanges > 500) {
    warn(
      `Large PR detected (${totalChanges} lines changed). Consider breaking it into smaller PRs for easier review.`
    );
  } else if (totalChanges > 1000) {
    fail(
      `Extremely large PR (${totalChanges} lines). Please break this into multiple smaller PRs.`
    );
  }

  // ============================================================================
  // Rule 2: Check for Tests
  // ============================================================================
  // Any app code changes should include test updates

  const appFiles = git.fileMatch("src/**/*.ts");
  const testFiles = git.fileMatch("**/*.test.ts");

  // Check if app code changed but tests didn't
  if (appFiles.edited.length > 0 && testFiles.edited.length === 0) {
    warn(
      `App code was modified (${appFiles.edited.length} files) but no test files were updated. Consider adding or updating tests.`,
      appFiles.edited[0]
    );
  }

  // Check for new code without tests
  if (appFiles.created.length > 0 && testFiles.created.length === 0) {
    fail(
      `New source files added but no test files created. Tests are required for new code.`
    );
  }

  // ============================================================================
  // Rule 3: Check CHANGELOG
  // ============================================================================
  // Significant changes should be documented

  const hasSourceChanges = git.hasChanges("src/**/*.ts");
  const hasChangelog = git.modified_files.includes("CHANGELOG.md");

  if (hasSourceChanges && !hasChangelog) {
    warn(
      "Source code was modified but CHANGELOG.md was not updated. Please document your changes."
    );
  }

  // ============================================================================
  // Rule 4: Check for Debugging Code
  // ============================================================================
  // Warn about potential debugging code that shouldn't be committed

  const sourceFiles = git.fileMatch("src/**/*.{ts,js}");
  const changedSourceFiles = [...sourceFiles.edited, ...sourceFiles.created];

  // Note: In a real implementation, you'd read file contents and check for console.log
  // For this example, we'll just show the pattern
  if (changedSourceFiles.length > 0) {
    message(
      `💡 Remember to remove console.log statements before merging (${changedSourceFiles.length} source files changed)`
    );
  }

  // ============================================================================
  // Rule 5: Check Package Dependencies
  // ============================================================================
  // If package.json changes, lock file should too

  const packageJsonChanged = git.fileMatch("package.json").edited.length > 0;
  const lockFileChanged = git.fileMatch("package-lock.json").edited.length > 0;

  if (packageJsonChanged && !lockFileChanged) {
    fail(
      "package.json was modified but package-lock.json was not updated. Run npm install to update the lock file."
    );
  }

  if (packageJsonChanged) {
    message(
      "📦 Dependencies changed. Make sure to test thoroughly and document any breaking changes."
    );
  }

  // ============================================================================
  // Rule 6: GitHub PR Checks (only when GitHub is available)
  // ============================================================================

  if (review.github && pr) {
    // Check PR title follows convention
    const hasConventionalTitle = /^(feat|fix|docs|chore|test|refactor|perf|style)(\(.+\))?:/.test(
      pr.title
    );

    if (!hasConventionalTitle) {
      warn(
        `PR title should follow conventional commits format: "type: description" or "type(scope): description"\n` +
          `Examples: "feat: add user login", "fix(api): handle null values"`
      );
    }

    // Check PR has description
    if (!pr.body || pr.body.trim().length < 20) {
      warn(
        "PR description is too short. Please provide more context about what this PR does and why."
      );
    }

    // Check PR size from GitHub
    if (pr.additions + pr.deletions > 500) {
      warn(
        `GitHub reports ${pr.additions} additions and ${pr.deletions} deletions. Consider splitting this PR.`
      );
    }

    // Friendly message about the PR
    message(
      `👋 Hi @${pr.author.login}! Reviewing PR #${pr.number}: "${pr.title}"`
    );
  }

  // ============================================================================
  // Rule 7: File-Specific Checks
  // ============================================================================

  // Check for changes to sensitive files
  const sensitiveFiles = git.fileMatch("{.env*,**/secrets/**,**/config/prod*}");
  if (sensitiveFiles.edited.length > 0) {
    warn(
      `⚠️ Sensitive files were modified: ${sensitiveFiles.edited.join(", ")}. Double-check no secrets are committed.`
    );
  }

  // Check for large files
  const largeFilesThreshold = 100; // lines
  git.diffs.forEach(diff => {
    if (diff.changes > largeFilesThreshold) {
      message(
        `📄 Large file: ${diff.file} (${diff.changes} lines changed)`,
        diff.file
      );
    }
  });

  // ============================================================================
  // Summary
  // ============================================================================

  message(
    `✅ Reviewed ${git.modified_files.length} modified, ${git.created_files.length} created, ${git.deleted_files.length} deleted files`
  );

  // Add a nice markdown summary
  markdown(`
## 📊 Review Summary

**Changes:**
- Modified: ${git.modified_files.length} files
- Created: ${git.created_files.length} files
- Deleted: ${git.deleted_files.length} files
- Total changes: ${totalChanges} lines

**Commits:** ${git.commits.length}

---
*Automated review by velvet*
  `);
}
