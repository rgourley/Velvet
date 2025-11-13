import { warn, fail, message, markdown } from "velvet";

export default async function(review) {
  // Track stats
  const stats = {
    modified: review.git.modified_files.length,
    created: review.git.created_files.length,
    deleted: review.git.deleted_files.length,
  };

  message(`📊 Changes: +${stats.created} ~${stats.modified} -${stats.deleted}`);

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
    fail(`New code files added (${newCode.length}) but no tests found. Tests are required.`);
  }

  // REQUIRED: Changelog updates for source changes
  const hasSourceChanges = review.git.hasChanges("src/**/*");
  const hasChangelog = review.git.fileMatch("CHANGELOG.md").edited.length > 0;

  if (hasSourceChanges && !hasChangelog) {
    fail("Source code changed but CHANGELOG.md was not updated.");
  }

  // WARNING: Large PRs
  if (review.git.diffs.length > 30) {
    warn(`Large PR with ${review.git.diffs.length} files. Consider breaking into smaller PRs.`);
  }

  // WARNING: Package changes
  if (review.git.fileMatch("package*.json").edited.length > 0) {
    warn("Package dependencies changed. Ensure lock file is updated and changes are documented.");
  }

  // Add summary markdown
  markdown(`
## 📋 Review Summary

**Files:** ${stats.created + stats.modified + stats.deleted} total
- ✨ Created: ${stats.created}
- 📝 Modified: ${stats.modified}
- 🗑️ Deleted: ${stats.deleted}

**Commits:** ${review.git.commits.length}
  `);
}
