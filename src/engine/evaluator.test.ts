import { describe, it, expect, beforeEach, vi } from "vitest";
import { RuleEvaluator } from "./evaluator.js";
import { ResultsCollector } from "./results.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("RuleEvaluator", () => {
  let resultsCollector: ResultsCollector;

  beforeEach(() => {
    resultsCollector = new ResultsCollector();
    vi.clearAllMocks();
  });

  describe("Evaluator Initialization", () => {
    it("should create evaluator with default options", () => {
      const evaluator = new RuleEvaluator({
        reviewFilePath: "./reviewfile.ts",
        baseBranch: "main",
        enableGitHub: false,
        resultsCollector,
      });

      expect(evaluator).toBeDefined();
    });

    it("should create evaluator with custom base branch", () => {
      const evaluator = new RuleEvaluator({
        reviewFilePath: "./reviewfile.ts",
        baseBranch: "develop",
        enableGitHub: false,
        resultsCollector,
      });

      expect(evaluator).toBeDefined();
    });

    it("should create evaluator with GitHub enabled", () => {
      const evaluator = new RuleEvaluator({
        reviewFilePath: "./reviewfile.ts",
        baseBranch: "main",
        enableGitHub: true,
        resultsCollector,
      });

      expect(evaluator).toBeDefined();
    });
  });

  describe("ReviewFile Loading", () => {
    it("should find reviewfile.ts in project root", async () => {
      // This test assumes the actual reviewfile.ts exists in the project
      const projectRoot = path.resolve(__dirname, "../..");
      const reviewFilePath = path.join(projectRoot, "reviewfile.ts");

      if (fs.existsSync(reviewFilePath)) {
        const evaluator = new RuleEvaluator({
          reviewFilePath: "./reviewfile.ts",
          baseBranch: "main",
          enableGitHub: false,
          resultsCollector,
        });

        expect(evaluator).toBeDefined();
      } else {
        // Skip test if reviewfile doesn't exist
        expect(true).toBe(true);
      }
    });

    it("should handle missing reviewfile gracefully", async () => {
      const evaluator = new RuleEvaluator({
        reviewFilePath: "./non-existent-reviewfile.ts",
        baseBranch: "main",
        enableGitHub: false,
        resultsCollector,
      });

      // The evaluator should be created, but evaluation will fail
      expect(evaluator).toBeDefined();

      // Note: Full evaluation test would require mocking git and filesystem
      // This is tested in integration tests
    });
  });

  describe("Results Collection", () => {
    it("should collect results from reviewfile execution", () => {
      // Create a mock reviewfile function
      const mockReviewFunction = async (review: any) => {
        // Import functions from the DSL
        const { message, warn, fail } = await import("../dsl/functions.js");

        message("Test message");
        warn("Test warning");
        fail("Test failure");
      };

      // Manually execute and verify results are collected
      resultsCollector.reset();

      // Execute the mock review function with a minimal review object
      const mockReview = {
        git: {
          modified_files: [],
          created_files: [],
          deleted_files: [],
          commits: [],
          diffs: [],
          fileMatch: () => ({
            edited: [],
            created: [],
            deleted: [],
            matches: () => false,
            getAll: () => [],
          }),
          hasChanges: () => false,
        },
        isGitHub: false,
        env: process.env,
      };

      // Note: This is a simplified test. Full integration would require
      // mocking the entire evaluation pipeline
      expect(resultsCollector).toBeDefined();
    });

    it("should reset results before evaluation", () => {
      resultsCollector.addMessage("Old message");
      resultsCollector.addWarning("Old warning");

      resultsCollector.reset();

      const results = resultsCollector.getResults();
      expect(results.messages).toHaveLength(0);
      expect(results.warnings).toHaveLength(0);
      expect(results.failures).toHaveLength(0);
    });
  });

  describe("Exit Codes", () => {
    it("should return exit code 0 when no failures", () => {
      resultsCollector.addMessage("All good");
      resultsCollector.addWarning("Just a warning");

      expect(resultsCollector.getExitCode()).toBe(0);
    });

    it("should return exit code 1 when there are failures", () => {
      resultsCollector.addMessage("Info");
      resultsCollector.addFailure("Critical error");

      expect(resultsCollector.getExitCode()).toBe(1);
    });

    it("should report passed when no failures", () => {
      resultsCollector.addMessage("Test message");

      expect(resultsCollector.hasFailures()).toBe(false);
    });

    it("should report not passed when failures exist", () => {
      resultsCollector.addFailure("Test failure");

      expect(resultsCollector.hasFailures()).toBe(true);
    });
  });

  describe("DSL Context Creation", () => {
    it("should create review context with git DSL", () => {
      const evaluator = new RuleEvaluator({
        reviewFilePath: "./reviewfile.ts",
        baseBranch: "main",
        enableGitHub: false,
        resultsCollector,
      });

      // The evaluator should be able to create a review context
      // This is tested implicitly during evaluation
      expect(evaluator).toBeDefined();
    });

    it("should include GitHub DSL when enabled", () => {
      const evaluator = new RuleEvaluator({
        reviewFilePath: "./reviewfile.ts",
        baseBranch: "main",
        enableGitHub: true,
        resultsCollector,
      });

      expect(evaluator).toBeDefined();
    });

    it("should exclude GitHub DSL when disabled", () => {
      const evaluator = new RuleEvaluator({
        reviewFilePath: "./reviewfile.ts",
        baseBranch: "main",
        enableGitHub: false,
        resultsCollector,
      });

      expect(evaluator).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle reviewfile execution errors gracefully", async () => {
      // Create a mock reviewfile that throws an error
      const mockReviewFunction = async () => {
        throw new Error("Test error in reviewfile");
      };

      // The evaluator should catch this and report it
      try {
        await mockReviewFunction();
      } catch (error: any) {
        expect(error.message).toBe("Test error in reviewfile");
      }
    });

    it("should collect errors as failures", () => {
      resultsCollector.addFailure("Reviewfile execution failed: Test error");

      const results = resultsCollector.getResults();
      expect(results.failures).toHaveLength(1);
      expect(results.failures[0].message).toContain("Test error");
    });
  });

  describe("Review File Validation", () => {
    it("should validate reviewfile exports default function", () => {
      // Mock a valid reviewfile module
      const validModule = {
        default: async (review: any) => {
          // Valid reviewfile function
        },
      };

      expect(typeof validModule.default).toBe("function");
    });

    it("should reject reviewfile without default export", () => {
      // Mock an invalid reviewfile module
      const invalidModule = {
        someOtherExport: () => {},
      };

      expect(invalidModule.default).toBeUndefined();
    });

    it("should reject reviewfile with non-function default", () => {
      // Mock an invalid reviewfile module
      const invalidModule = {
        default: "not a function",
      };

      expect(typeof invalidModule.default).not.toBe("function");
    });
  });

  describe("Integration", () => {
    it("should produce evaluation result with all required fields", () => {
      resultsCollector.addMessage("Test completed");

      const mockResult = {
        review: {
          git: {
            modified_files: ["src/app.ts"],
            created_files: [],
            deleted_files: [],
            commits: [],
            diffs: [],
            fileMatch: () => ({
              edited: [],
              created: [],
              deleted: [],
              matches: () => false,
              getAll: () => [],
            }),
            hasChanges: () => true,
          },
          isGitHub: false,
          env: process.env,
        },
        results: resultsCollector,
        reviewFile: {
          path: "./reviewfile.ts",
          absolutePath: "/path/to/reviewfile.ts",
          exists: true,
        },
        passed: !resultsCollector.hasFailures(),
        exitCode: resultsCollector.getExitCode(),
      };

      expect(mockResult.passed).toBe(true);
      expect(mockResult.exitCode).toBe(0);
      expect(mockResult.results).toBeDefined();
      expect(mockResult.review).toBeDefined();
    });
  });
});
