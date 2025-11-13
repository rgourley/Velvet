/**
 * Main DSL exports - Danger-like API for code review automation
 */

import { Git } from "./git.js";
import { GitHub } from "./github.js";
import type { ReviewDSL } from "./types.js";

// Export types
export * from "./types.js";

// Export classes
export { Git } from "./git.js";
export { GitHub } from "./github.js";

// Export global functions
export {
  message,
  warn,
  fail,
  markdown,
  getResults,
  hasFailures,
  hasWarnings,
  getTotalCount,
  formatSummary,
  resetResults,
} from "./functions.js";

/**
 * Create and initialize the review DSL context
 */
export async function createReviewContext(
  options: {
    baseBranch?: string;
    enableGitHub?: boolean;
    repoPath?: string;
  } = {}
): Promise<ReviewDSL> {
  const { baseBranch = "main", enableGitHub = true, repoPath } = options;

  // Initialize Git DSL
  const git = new Git(repoPath);
  await git.initialize(baseBranch);

  // Check if we're in GitHub environment
  const isGitHub = !!(
    process.env.GITHUB_ACTIONS && process.env.GITHUB_REPOSITORY
  );

  // Initialize GitHub DSL if enabled and in GitHub environment
  let github: GitHub | undefined;
  if (enableGitHub && isGitHub) {
    try {
      github = new GitHub();
      await github.initialize();
    } catch (error) {
      console.warn("Failed to initialize GitHub context:", error);
    }
  }

  // Create the review DSL object
  const review: ReviewDSL = {
    git,
    github,
    isGitHub,
    env: process.env as Record<string, string | undefined>,
  };

  return review;
}

/**
 * Global singleton instance (initialized on first use)
 */
let reviewInstance: ReviewDSL | null = null;

/**
 * Get or create the global review instance
 */
export async function getReview(
  options?: Parameters<typeof createReviewContext>[0]
): Promise<ReviewDSL> {
  if (!reviewInstance) {
    reviewInstance = await createReviewContext(options);
  }
  return reviewInstance;
}

/**
 * Reset the global review instance (useful for testing)
 */
export function resetReview(): void {
  reviewInstance = null;
}
