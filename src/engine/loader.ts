import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";

export interface ReviewFileInfo {
  path: string;
  absolutePath: string;
  exists: boolean;
  isTypeScript: boolean;
}

/**
 * Find reviewfile in the project directory
 */
export function findReviewFile(
  providedPath?: string,
  projectRoot: string = process.cwd()
): ReviewFileInfo {
  // If path is provided, use it
  if (providedPath) {
    const absolutePath = path.isAbsolute(providedPath)
      ? providedPath
      : path.resolve(projectRoot, providedPath);

    return {
      path: providedPath,
      absolutePath,
      exists: fs.existsSync(absolutePath),
      isTypeScript: absolutePath.endsWith(".ts"),
    };
  }

  // Search for reviewfile.ts or reviewfile.js in project root
  const extensions = [".ts", ".js", ".mts", ".mjs"];
  const baseName = "reviewfile";

  for (const ext of extensions) {
    const fileName = baseName + ext;
    const filePath = path.join(projectRoot, fileName);

    if (fs.existsSync(filePath)) {
      return {
        path: fileName,
        absolutePath: filePath,
        exists: true,
        isTypeScript: ext === ".ts" || ext === ".mts",
      };
    }
  }

  // Default to reviewfile.ts (even if it doesn't exist)
  const defaultPath = path.join(projectRoot, "reviewfile.ts");
  return {
    path: "reviewfile.ts",
    absolutePath: defaultPath,
    exists: false,
    isTypeScript: true,
  };
}

/**
 * Load and validate reviewfile module
 */
export async function loadReviewFile(
  filePath: string
): Promise<(review: any) => Promise<void>> {
  try {
    // Convert to file URL for ESM import
    const fileUrl = pathToFileURL(filePath).href;

    // Dynamic import the module
    const module = await import(fileUrl);

    // Validate that it exports a default function
    if (!module.default || typeof module.default !== "function") {
      throw new Error(
        "Reviewfile must export a default async function.\n\n" +
          "Example:\n" +
          "  export default async function(review) {\n" +
          '    warn("Example warning");\n' +
          "  }"
      );
    }

    return module.default;
  } catch (error) {
    if (error instanceof Error) {
      // Enhance error message
      if (error.message.includes("Cannot find module")) {
        throw new Error(
          `Failed to load reviewfile: ${filePath}\n` +
            "File not found or could not be imported."
        );
      }

      if (error.message.includes("Unexpected token")) {
        throw new Error(
          `Failed to parse reviewfile: ${filePath}\n` +
            "Syntax error in the file. Please check your TypeScript/JavaScript syntax.\n\n" +
            `Original error: ${error.message}`
        );
      }

      throw error;
    }

    throw new Error(`Unknown error loading reviewfile: ${filePath}`);
  }
}

/**
 * Validate reviewfile exists and is accessible
 */
export function validateReviewFile(info: ReviewFileInfo): void {
  if (!info.exists) {
    throw new Error(
      `Reviewfile not found: ${info.path}\n\n` +
        "Create a reviewfile.ts to define your review rules:\n\n" +
        "  import { warn, fail, message } from 'code-review-ai';\n\n" +
        "  export default async function(review) {\n" +
        "    // Your review logic here\n" +
        '    if (review.git.fileMatch("package.json").edited.length > 0) {\n' +
        '      warn("package.json was modified");\n' +
        "    }\n" +
        "  }\n\n" +
        "Or run: review-ai init"
    );
  }

  // Check if file is readable
  try {
    fs.accessSync(info.absolutePath, fs.constants.R_OK);
  } catch {
    throw new Error(
      `Reviewfile is not readable: ${info.path}\n` +
        "Please check file permissions."
    );
  }
}

/**
 * Get example reviewfile content
 */
export function getExampleReviewFile(): string {
  return `import { warn, fail, message } from "code-review-ai";

export default async function(review) {
  // Example 1: Check if package.json was modified
  if (review.git.fileMatch("package.json").edited.length > 0) {
    warn("package.json was modified. Did you update the changelog?");
  }

  // Example 2: Check PR title format (GitHub only)
  if (review.github && !review.github.titleMatches(/^[A-Z]+-\\\\d+:/)) {
    fail("PR title must start with a ticket number (e.g., PROJ-123: Description)");
  }

  // Example 3: Check for large PRs
  if (review.git.diffs.length > 50) {
    warn("This PR is quite large. Consider breaking it into smaller PRs.");
  }

  // Example 4: Check if tests were added for new features
  const newFiles = review.git.created_files;
  const hasNewCode = newFiles.some(f => f.endsWith('.ts') || f.endsWith('.js'));
  const hasNewTests = newFiles.some(f => f.includes('test') || f.includes('spec'));

  if (hasNewCode && !hasNewTests) {
    warn("New code was added but no tests were found. Consider adding tests.");
  }

  // Example 5: Informational message
  message(\`Reviewing \${review.git.commits.length} commit(s)\`);
}
`;
}

/**
 * Create a sample reviewfile
 */
export function createSampleReviewFile(
  projectRoot: string = process.cwd()
): string {
  const filePath = path.join(projectRoot, "reviewfile.ts");

  if (fs.existsSync(filePath)) {
    throw new Error("reviewfile.ts already exists!");
  }

  fs.writeFileSync(filePath, getExampleReviewFile(), "utf-8");

  return filePath;
}
