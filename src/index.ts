/**
 * Code Review AI - Main Library Exports
 *
 * This file exports the DSL and core functionality that can be used
 * in reviewfiles or programmatically in other Node.js applications.
 */

// Export the complete DSL
export * from "./dsl/index.js";

// Export the evaluation engine
export * from "./engine/index.js";

// Export commands (for programmatic usage)
export { reviewCommand } from "./commands/review.js";
