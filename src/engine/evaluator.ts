import { createReviewContext } from "../dsl/index.js";
import type { ReviewDSL } from "../dsl/types.js";
import { globalResultsCollector, ResultsCollector } from "./results.js";
import {
  findReviewFile,
  loadReviewFile,
  validateReviewFile,
  type ReviewFileInfo,
} from "./loader.js";

export interface EvaluatorOptions {
  /**
   * Path to reviewfile (optional, will auto-detect)
   */
  reviewFilePath?: string;

  /**
   * Base branch to compare against
   */
  baseBranch?: string;

  /**
   * Enable GitHub integration
   */
  enableGitHub?: boolean;

  /**
   * Project root directory
   */
  projectRoot?: string;

  /**
   * Custom results collector (for testing)
   */
  resultsCollector?: ResultsCollector;
}

export interface EvaluationResult {
  /**
   * Review context that was used
   */
  review: ReviewDSL;

  /**
   * Results collector with all findings
   */
  results: ResultsCollector;

  /**
   * Reviewfile info
   */
  reviewFile: ReviewFileInfo;

  /**
   * Whether the review passed (no failures)
   */
  passed: boolean;

  /**
   * Exit code (0 = success, 1 = failure)
   */
  exitCode: number;
}

/**
 * Main rule evaluator - orchestrates the entire review process
 */
export class RuleEvaluator {
  private options: Required<EvaluatorOptions>;

  constructor(options: EvaluatorOptions = {}) {
    this.options = {
      reviewFilePath: options.reviewFilePath || "",
      baseBranch: options.baseBranch || "main",
      enableGitHub: options.enableGitHub !== false,
      projectRoot: options.projectRoot || process.cwd(),
      resultsCollector: options.resultsCollector || globalResultsCollector,
    };
  }

  /**
   * Run the complete evaluation process
   */
  async evaluate(): Promise<EvaluationResult> {
    // Reset results
    this.options.resultsCollector.reset();

    // Step 1: Find reviewfile
    const reviewFile = findReviewFile(
      this.options.reviewFilePath,
      this.options.projectRoot
    );

    // Step 2: Validate it exists
    validateReviewFile(reviewFile);

    // Step 3: Create review context (Git + GitHub DSL)
    const review = await createReviewContext({
      baseBranch: this.options.baseBranch,
      enableGitHub: this.options.enableGitHub,
      repoPath: this.options.projectRoot,
    });

    // Step 4: Load the reviewfile
    const reviewFunction = await loadReviewFile(reviewFile.absolutePath);

    // Step 5: Execute the reviewfile with the review context
    // This is where user code runs and calls warn(), fail(), message(), markdown()
    await this.executeReviewFile(reviewFunction, review);

    // Step 6: Collect and return results
    return {
      review,
      results: this.options.resultsCollector,
      reviewFile,
      passed: !this.options.resultsCollector.hasFailures(),
      exitCode: this.options.resultsCollector.getExitCode(),
    };
  }

  /**
   * Execute the reviewfile function with error handling
   */
  private async executeReviewFile(
    reviewFunction: (review: ReviewDSL) => Promise<void>,
    review: ReviewDSL
  ): Promise<void> {
    try {
      // Execute user's review function
      await reviewFunction(review);
    } catch (error) {
      // If user's code throws an error, capture it as a failure
      if (error instanceof Error) {
        this.options.resultsCollector.addFailure(
          `Review execution failed: ${error.message}\n\nStack trace:\n${error.stack}`
        );
      } else {
        this.options.resultsCollector.addFailure(
          `Review execution failed with unknown error: ${String(error)}`
        );
      }
    }
  }

  /**
   * Get the results collector
   */
  getResults(): ResultsCollector {
    return this.options.resultsCollector;
  }
}

/**
 * Convenience function to run evaluation with minimal setup
 */
export async function runReview(
  options: EvaluatorOptions = {}
): Promise<EvaluationResult> {
  const evaluator = new RuleEvaluator(options);
  return await evaluator.evaluate();
}
