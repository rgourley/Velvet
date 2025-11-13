import { globalResultsCollector } from "../engine/results.js";

/**
 * Post an informational message
 */
export function message(msg: string, file?: string, line?: number): void {
  globalResultsCollector.addMessage(msg, file, line);
}

/**
 * Post a warning (non-blocking)
 */
export function warn(msg: string, file?: string, line?: number): void {
  globalResultsCollector.addWarning(msg, file, line);
}

/**
 * Post a failure (blocking, should prevent merge)
 */
export function fail(msg: string, file?: string, line?: number): void {
  globalResultsCollector.addFailure(msg, file, line);
}

/**
 * Post markdown content (will be rendered in PR comment)
 */
export function markdown(content: string): void {
  globalResultsCollector.addMarkdown(content);
}

/**
 * Get all results (for advanced usage)
 */
export function getResults() {
  return globalResultsCollector.getResults();
}

/**
 * Check if there are any failures
 */
export function hasFailures(): boolean {
  return globalResultsCollector.hasFailures();
}

/**
 * Check if there are any warnings
 */
export function hasWarnings(): boolean {
  return globalResultsCollector.hasWarnings();
}

/**
 * Get total count of all results
 */
export function getTotalCount(): number {
  return globalResultsCollector.getTotalCount();
}

/**
 * Format results as a summary string
 */
export function formatSummary(): string {
  return globalResultsCollector.formatSummary();
}

/**
 * Reset results (useful for testing)
 */
export function resetResults(): void {
  globalResultsCollector.reset();
}
