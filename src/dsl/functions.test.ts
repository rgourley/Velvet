import { describe, it, expect, beforeEach } from "vitest";
import { message, warn, fail, markdown } from "./functions.js";
import { globalResultsCollector } from "../engine/results.js";

describe("DSL Functions", () => {
  beforeEach(() => {
    // Reset the global results collector before each test
    globalResultsCollector.reset();
  });

  describe("message()", () => {
    it("should collect a simple message", () => {
      message("This is a test message");

      const results = globalResultsCollector.getResults();
      expect(results.messages).toHaveLength(1);
      expect(results.messages[0].message).toBe("This is a test message");
      expect(results.messages[0].file).toBeUndefined();
      expect(results.messages[0].line).toBeUndefined();
    });

    it("should collect a message with file", () => {
      message("Check this file", "src/app.ts");

      const results = globalResultsCollector.getResults();
      expect(results.messages).toHaveLength(1);
      expect(results.messages[0].message).toBe("Check this file");
      expect(results.messages[0].file).toBe("src/app.ts");
    });

    it("should collect a message with file and line", () => {
      message("Issue on this line", "src/app.ts", 42);

      const results = globalResultsCollector.getResults();
      expect(results.messages).toHaveLength(1);
      expect(results.messages[0].message).toBe("Issue on this line");
      expect(results.messages[0].file).toBe("src/app.ts");
      expect(results.messages[0].line).toBe(42);
    });

    it("should collect multiple messages", () => {
      message("First message");
      message("Second message");
      message("Third message");

      const results = globalResultsCollector.getResults();
      expect(results.messages).toHaveLength(3);
      expect(results.messages[0].message).toBe("First message");
      expect(results.messages[1].message).toBe("Second message");
      expect(results.messages[2].message).toBe("Third message");
    });
  });

  describe("warn()", () => {
    it("should collect a warning", () => {
      warn("This is a warning");

      const results = globalResultsCollector.getResults();
      expect(results.warnings).toHaveLength(1);
      expect(results.warnings[0].message).toBe("This is a warning");
      expect(results.warnings[0].file).toBeUndefined();
    });

    it("should collect a warning with file", () => {
      warn("Large file detected", "src/big-file.ts");

      const results = globalResultsCollector.getResults();
      expect(results.warnings).toHaveLength(1);
      expect(results.warnings[0].message).toBe("Large file detected");
      expect(results.warnings[0].file).toBe("src/big-file.ts");
    });

    it("should collect a warning with file and line", () => {
      warn("Potential issue here", "src/utils.ts", 123);

      const results = globalResultsCollector.getResults();
      expect(results.warnings).toHaveLength(1);
      expect(results.warnings[0].message).toBe("Potential issue here");
      expect(results.warnings[0].file).toBe("src/utils.ts");
      expect(results.warnings[0].line).toBe(123);
    });

    it("should collect multiple warnings", () => {
      warn("Warning 1");
      warn("Warning 2");
      warn("Warning 3");

      const results = globalResultsCollector.getResults();
      expect(results.warnings).toHaveLength(3);
    });

    it("should not affect hasFailures()", () => {
      warn("This is just a warning");

      expect(globalResultsCollector.hasFailures()).toBe(false);
    });
  });

  describe("fail()", () => {
    it("should collect a failure", () => {
      fail("This is a failure");

      const results = globalResultsCollector.getResults();
      expect(results.failures).toHaveLength(1);
      expect(results.failures[0].message).toBe("This is a failure");
    });

    it("should collect a failure with file", () => {
      fail("Tests are required", "src/new-feature.ts");

      const results = globalResultsCollector.getResults();
      expect(results.failures).toHaveLength(1);
      expect(results.failures[0].message).toBe("Tests are required");
      expect(results.failures[0].file).toBe("src/new-feature.ts");
    });

    it("should collect a failure with file and line", () => {
      fail("Critical error", "src/api.ts", 55);

      const results = globalResultsCollector.getResults();
      expect(results.failures).toHaveLength(1);
      expect(results.failures[0].message).toBe("Critical error");
      expect(results.failures[0].file).toBe("src/api.ts");
      expect(results.failures[0].line).toBe(55);
    });

    it("should set hasFailures() to true", () => {
      fail("Critical issue");

      expect(globalResultsCollector.hasFailures()).toBe(true);
    });

    it("should collect multiple failures", () => {
      fail("Failure 1");
      fail("Failure 2");

      const results = globalResultsCollector.getResults();
      expect(results.failures).toHaveLength(2);
      expect(globalResultsCollector.hasFailures()).toBe(true);
    });
  });

  describe("markdown()", () => {
    it("should collect markdown content", () => {
      markdown("## Summary\nEverything looks good!");

      const results = globalResultsCollector.getResults();
      expect(results.markdowns).toHaveLength(1);
      expect(results.markdowns[0]).toBe("## Summary\nEverything looks good!");
    });

    it("should collect multiple markdown blocks", () => {
      markdown("## Section 1");
      markdown("## Section 2");

      const results = globalResultsCollector.getResults();
      expect(results.markdowns).toHaveLength(2);
      expect(results.markdowns[0]).toBe("## Section 1");
      expect(results.markdowns[1]).toBe("## Section 2");
    });
  });

  describe("Mixed Results", () => {
    it("should collect all types of results", () => {
      message("Info message");
      warn("Warning message");
      fail("Failure message");
      markdown("## Summary");

      const results = globalResultsCollector.getResults();
      expect(results.messages).toHaveLength(1);
      expect(results.warnings).toHaveLength(1);
      expect(results.failures).toHaveLength(1);
      expect(results.markdowns).toHaveLength(1);
    });

    it("should maintain correct exit code", () => {
      message("Just info");
      warn("Some warnings");

      expect(globalResultsCollector.getExitCode()).toBe(0);

      fail("Now it fails");

      expect(globalResultsCollector.getExitCode()).toBe(1);
    });
  });

  describe("Results Formatting", () => {
    it("should format results for terminal", () => {
      message("Info: All good");
      warn("Warning: Large PR");
      fail("Error: No tests");

      const output = globalResultsCollector.formatForTerminal();

      expect(output).toContain("Info: All good");
      expect(output).toContain("Warning: Large PR");
      expect(output).toContain("Error: No tests");
    });

    it("should format results as markdown", () => {
      message("Info message");
      warn("Warning message");
      fail("Failure message");
      markdown("## Custom Summary");

      const output = globalResultsCollector.formatAsMarkdown();

      expect(output).toContain("Info message");
      expect(output).toContain("Warning message");
      expect(output).toContain("Failure message");
      expect(output).toContain("## Custom Summary");
    });
  });

  describe("Reset", () => {
    it("should clear all results after reset", () => {
      message("Message 1");
      warn("Warning 1");
      fail("Failure 1");
      markdown("## Markdown 1");

      globalResultsCollector.reset();

      const results = globalResultsCollector.getResults();
      expect(results.messages).toHaveLength(0);
      expect(results.warnings).toHaveLength(0);
      expect(results.failures).toHaveLength(0);
      expect(results.markdowns).toHaveLength(0);
      expect(globalResultsCollector.hasFailures()).toBe(false);
    });
  });
});
