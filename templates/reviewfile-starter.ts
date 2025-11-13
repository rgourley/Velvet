/**
 * Minimal Reviewfile Starter Template
 *
 * This is a basic starter template with common patterns.
 * Customize these rules to match your team's workflow.
 */

import { warn, fail, message, markdown } from "velvet";

export default async function(review) {
  const git = review.git;
  const pr = review.github?.pr;

  // Welcome message
  if (pr) {
    message(`👋 Reviewing PR #${pr.number}: "${pr.title}"`);
  }

  // Rule: Check PR size
  const totalChanges = git.diffs.reduce(
    (sum, diff) => sum + diff.additions + diff.deletions,
    0
  );

  if (totalChanges > 500) {
    warn(`Large PR: ${totalChanges} lines changed. Consider breaking into smaller PRs.`);
  }

  // Rule: Require tests for new code
  const newSourceFiles = git.created_files.filter(
    f => (f.endsWith(".ts") || f.endsWith(".js")) && !f.includes("test") && !f.includes("spec")
  );
  const newTestFiles = git.created_files.filter(
    f => f.includes("test.") || f.includes("spec.")
  );

  if (newSourceFiles.length > 0 && newTestFiles.length === 0) {
    fail("New source files added but no tests found. Please add tests.");
  }

  // Rule: Check for package.json changes
  if (git.fileMatch("package.json").edited.length > 0) {
    message("📦 Dependencies changed. Make sure to update the lock file and test thoroughly.");
  }

  // Summary
  markdown(`
## 📊 Review Summary

**Files Changed:**
- Modified: ${git.modified_files.length}
- Created: ${git.created_files.length}
- Deleted: ${git.deleted_files.length}

**Total Changes:** ${totalChanges} lines
  `);
}
