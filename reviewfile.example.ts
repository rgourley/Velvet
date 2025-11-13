import { warn, fail, message, markdown } from "./dist/index.js";

export default async function (review) {
  // Show repo stats
  message(
    `Reviewing ${review.git.commits.length} commit(s) with ${review.git.modified_files.length} modified files`
  );

  // Check for package.json changes
  const packageJson = review.git.fileMatch("package.json");
  if (packageJson.edited.length > 0) {
    warn(
      "package.json was modified. Did you update the changelog?",
      "package.json"
    );
  }

  // Check for TypeScript files
  const tsFiles = review.git.fileMatch("**/*.ts");
  if (tsFiles.created.length > 0) {
    message(
      `Created ${tsFiles.created.length} new TypeScript file(s): ${tsFiles.created.join(", ")}`
    );
  }

  // Check for tests
  const testFiles = review.git.fileMatch("**/*.test.ts");
  const hasNewCode = tsFiles.created.length > 0;
  const hasNewTests = testFiles.created.length > 0;

  if (hasNewCode && !hasNewTests) {
    warn("New TypeScript code added but no tests were found.");
  }

  // Check file size (example of custom logic)
  const allFiles = review.git.getChangedFiles();
  if (allFiles.length > 20) {
    warn(
      `Large PR detected with ${allFiles.length} changed files. Consider breaking it into smaller PRs.`
    );
  }

  // Add markdown summary
  if (review.git.diffs.length > 0) {
    markdown(`
## Review Summary

**Files Changed:** ${review.git.diffs.length}
**Commits:** ${review.git.commits.length}
**Modified:** ${review.git.modified_files.length}
**Created:** ${review.git.created_files.length}
**Deleted:** ${review.git.deleted_files.length}
  `);
  }
}
