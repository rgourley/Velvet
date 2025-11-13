import { warn, message } from "./dist/index.js";

export default async function (review) {
  // Example 1: Check if package.json was modified
  if (review.git.fileMatch("package.json").edited.length > 0) {
    warn("package.json was modified. Did you update the changelog?");
  }

  // Example 2: Check for large PRs
  if (review.git.diffs.length > 50) {
    warn("This PR is quite large. Consider breaking it into smaller PRs.");
  }

  // Example 3: Check if tests were added for new features
  const newFiles = review.git.created_files;
  const hasNewCode = newFiles.some(
    f => f.endsWith(".ts") || f.endsWith(".js")
  );
  const hasNewTests = newFiles.some(
    f => f.includes("test") || f.includes("spec")
  );

  if (hasNewCode && !hasNewTests) {
    warn("New code was added but no tests were found. Consider adding tests.");
  }

  // Example 4: Check for DSL files
  const dslFiles = review.git.fileMatch("src/dsl/**/*.ts");
  if (dslFiles.getAll().length > 0) {
    message(`Modified ${dslFiles.getAll().length} DSL file(s)`);
  }

  // Example 5: Informational message
  message(`Reviewing ${review.git.commits.length} commit(s)`);
}
