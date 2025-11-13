import chalk from "chalk";
import type { ReviewResult, ReviewResults, ResultLevel } from "../dsl/types.js";

/**
 * ResultsCollector - Collects and formats review results
 */
export class ResultsCollector {
  private results: ReviewResults = {
    messages: [],
    warnings: [],
    failures: [],
    markdowns: [],
  };

  /**
   * Reset all results
   */
  reset(): void {
    this.results = {
      messages: [],
      warnings: [],
      failures: [],
      markdowns: [],
    };
  }

  /**
   * Add a message result
   */
  addMessage(message: string, file?: string, line?: number): void {
    this.results.messages.push({
      level: "message",
      message,
      file,
      line,
    });
  }

  /**
   * Add a warning result
   */
  addWarning(message: string, file?: string, line?: number): void {
    this.results.warnings.push({
      level: "warn",
      message,
      file,
      line,
    });
  }

  /**
   * Add a failure result
   */
  addFailure(message: string, file?: string, line?: number): void {
    this.results.failures.push({
      level: "fail",
      message,
      file,
      line,
    });
  }

  /**
   * Add markdown content
   */
  addMarkdown(content: string): void {
    this.results.markdowns.push(content);
  }

  /**
   * Get all results
   */
  getResults(): ReviewResults {
    return this.results;
  }

  /**
   * Check if there are any failures
   */
  hasFailures(): boolean {
    return this.results.failures.length > 0;
  }

  /**
   * Check if there are any warnings
   */
  hasWarnings(): boolean {
    return this.results.warnings.length > 0;
  }

  /**
   * Get total count of all issues
   */
  getTotalCount(): number {
    return (
      this.results.messages.length +
      this.results.warnings.length +
      this.results.failures.length
    );
  }

  /**
   * Format a summary string
   */
  formatSummary(): string {
    const parts = [];

    if (this.results.failures.length > 0) {
      parts.push(`${this.results.failures.length} failure(s)`);
    }
    if (this.results.warnings.length > 0) {
      parts.push(`${this.results.warnings.length} warning(s)`);
    }
    if (this.results.messages.length > 0) {
      parts.push(`${this.results.messages.length} message(s)`);
    }

    return parts.length > 0 ? parts.join(", ") : "No issues found";
  }

  /**
   * Format results for terminal output with colors
   */
  formatForTerminal(): string {
    const output: string[] = [];

    output.push(chalk.bold("Review Results:"));
    output.push(chalk.gray("─".repeat(50)));

    // Failures
    if (this.results.failures.length > 0) {
      output.push(
        chalk.red.bold(`\n❌ Failures (${this.results.failures.length}):`)
      );
      this.results.failures.forEach(failure => {
        const location = this.formatLocation(failure);
        output.push(chalk.red(`  • ${failure.message}${location}`));
      });
    }

    // Warnings
    if (this.results.warnings.length > 0) {
      output.push(
        chalk.yellow.bold(`\n⚠️  Warnings (${this.results.warnings.length}):`)
      );
      this.results.warnings.forEach(warning => {
        const location = this.formatLocation(warning);
        output.push(chalk.yellow(`  • ${warning.message}${location}`));
      });
    }

    // Messages
    if (this.results.messages.length > 0) {
      output.push(
        chalk.blue.bold(`\n💬 Messages (${this.results.messages.length}):`)
      );
      this.results.messages.forEach(message => {
        const location = this.formatLocation(message);
        output.push(chalk.blue(`  • ${message.message}${location}`));
      });
    }

    // Markdown content
    if (this.results.markdowns.length > 0) {
      output.push(chalk.blue.bold(`\n📝 Markdown content:`));
      this.results.markdowns.forEach(md => {
        output.push(chalk.gray(md));
      });
    }

    output.push(chalk.gray("\n" + "─".repeat(50)));
    output.push(chalk.bold(`Summary: ${this.formatSummary()}`));

    return output.join("\n");
  }

  /**
   * Format results as markdown for GitHub PR comment
   */
  formatAsMarkdown(): string {
    const output: string[] = [];

    output.push("## 🤖 Code Review Results\n");

    const summary = this.formatSummary();
    if (this.hasFailures()) {
      output.push(`❌ **Review Failed:** ${summary}\n`);
    } else if (this.hasWarnings()) {
      output.push(`⚠️ **Review Passed with Warnings:** ${summary}\n`);
    } else {
      output.push(`✅ **Review Passed:** ${summary}\n`);
    }

    // Failures
    if (this.results.failures.length > 0) {
      output.push("### ❌ Failures\n");
      this.results.failures.forEach(failure => {
        const location = failure.file
          ? ` \`${failure.file}${failure.line ? `:${failure.line}` : ""}\``
          : "";
        output.push(`- ${failure.message}${location}`);
      });
      output.push("");
    }

    // Warnings
    if (this.results.warnings.length > 0) {
      output.push("### ⚠️ Warnings\n");
      this.results.warnings.forEach(warning => {
        const location = warning.file
          ? ` \`${warning.file}${warning.line ? `:${warning.line}` : ""}\``
          : "";
        output.push(`- ${warning.message}${location}`);
      });
      output.push("");
    }

    // Messages
    if (this.results.messages.length > 0) {
      output.push("### 💬 Messages\n");
      this.results.messages.forEach(message => {
        const location = message.file
          ? ` \`${message.file}${message.line ? `:${message.line}` : ""}\``
          : "";
        output.push(`- ${message.message}${location}`);
      });
      output.push("");
    }

    // Custom markdown content
    if (this.results.markdowns.length > 0) {
      output.push("---\n");
      output.push(this.results.markdowns.join("\n\n"));
      output.push("");
    }

    output.push(
      "\n---\n*Generated by [velvet](https://github.com/yourusername/velvet)*"
    );

    return output.join("\n");
  }

  /**
   * Format location string for a result
   */
  private formatLocation(result: ReviewResult): string {
    if (!result.file) return "";

    const location = result.line
      ? `${result.file}:${result.line}`
      : result.file;

    return ` ${chalk.gray(`(${location})`)}`;
  }

  /**
   * Get exit code based on results (0 = success, 1 = failure)
   */
  getExitCode(): number {
    return this.hasFailures() ? 1 : 0;
  }

  /**
   * Get status message
   */
  getStatusMessage(): string {
    if (this.hasFailures()) {
      return chalk.red(
        "\n❌ Review failed due to blocking issues. Please fix the failures above."
      );
    } else if (this.hasWarnings()) {
      return chalk.yellow(
        "\n⚠️  Review passed with warnings. Consider addressing them."
      );
    } else {
      return chalk.green("\n✅ Review passed successfully!");
    }
  }

  /**
   * Export results as JSON
   */
  toJSON(): ReviewResults {
    return this.results;
  }

  /**
   * Import results from JSON
   */
  fromJSON(data: ReviewResults): void {
    this.results = data;
  }
}

/**
 * Global singleton instance
 */
export const globalResultsCollector = new ResultsCollector();
