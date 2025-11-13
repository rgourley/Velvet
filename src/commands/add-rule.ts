import Anthropic from "@anthropic-ai/sdk";
import inquirer from "inquirer";
import chalk from "chalk";
import { highlight } from "cli-highlight";
import * as fs from "fs";
import * as path from "path";
import ora from "ora";

interface AddRuleOptions {
  verbose?: boolean;
}

const DSL_CONTEXT = `You are a code review expert helping generate Velvet reviewfile rules.

Velvet DSL API:

## Review Object
- review.git.modified_files: string[]
- review.git.created_files: string[]
- review.git.deleted_files: string[]
- review.git.commits: Array<{ sha, author, date, message }>
- review.git.diffs: Array<{ file, additions, deletions, changes }>
- review.git.fileMatch(pattern): { edited: string[], created: string[], deleted: string[] }
- review.git.hasChanges(pattern): boolean

## GitHub (optional, check with if (review.github))
- review.github.pr.number
- review.github.pr.title
- review.github.pr.body
- review.github.pr.author.login
- review.github.pr.additions
- review.github.pr.deletions
- review.github.pr.changed_files

## Functions
- message(text, file?, line?) - Informational, non-blocking
- warn(text, file?, line?) - Warning, non-blocking
- fail(text, file?, line?) - Blocking failure
- markdown(content) - Custom markdown

Return ONLY the TypeScript code for the rule function body (the contents that go inside the async function).
Do NOT include the import statement or the export default async function wrapper.
Do NOT include explanations, just the code.`;

export async function addRuleCommand(options: AddRuleOptions): Promise<void> {
  console.log(chalk.bold.blue("\n🤖 AI-Powered Rule Generator\n"));

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      chalk.red(
        "❌ ANTHROPIC_API_KEY not found in environment variables.\n"
      )
    );
    console.log(
      "Please set your API key:\n" +
        "  1. Get a key from: https://console.anthropic.com/\n" +
        "  2. Add to .env file: ANTHROPIC_API_KEY=your-key-here\n" +
        "  3. Or export: export ANTHROPIC_API_KEY=your-key-here\n"
    );
    process.exit(1);
  }

  try {
    // Prompt for rule description
    const { description } = await inquirer.prompt([
      {
        type: "input",
        name: "description",
        message: "Describe the rule you want to add:",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Please provide a description";
          }
          return true;
        },
      },
    ]);

    if (options.verbose) {
      console.log(chalk.gray(`\nGenerating rule for: "${description}"`));
    }

    // Generate rule using Claude
    const spinner = ora("Generating rule with Claude...").start();

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${DSL_CONTEXT}\n\nGenerate a reviewfile rule that: ${description}`,
        },
      ],
    });

    spinner.stop();

    // Extract generated code
    const generatedCode =
      message.content[0].type === "text" ? message.content[0].text : "";

    if (!generatedCode.trim()) {
      console.error(chalk.red("❌ Failed to generate rule. Please try again."));
      process.exit(1);
    }

    // Clean up the code (remove markdown code blocks if present)
    let cleanedCode = generatedCode
      .replace(/^```typescript\n?/gm, "")
      .replace(/^```ts\n?/gm, "")
      .replace(/^```\n?/gm, "")
      .replace(/```$/gm, "")
      .trim();

    // Display generated code with syntax highlighting
    console.log(chalk.bold.green("\n✓ Generated rule:\n"));
    console.log(
      highlight(cleanedCode, {
        language: "typescript",
        theme: {
          keyword: chalk.cyan,
          built_in: chalk.cyan,
          string: chalk.green,
          comment: chalk.gray,
          function: chalk.yellow,
        },
      })
    );
    console.log(); // Empty line

    // Ask for confirmation
    const { addRule } = await inquirer.prompt([
      {
        type: "confirm",
        name: "addRule",
        message: "Add this rule to your reviewfile?",
        default: true,
      },
    ]);

    if (!addRule) {
      console.log(chalk.yellow("\n⚠️  Rule not added. Exiting."));
      return;
    }

    // Find or create reviewfile
    const projectRoot = process.cwd();
    const reviewFilePath = path.join(projectRoot, "reviewfile.ts");

    // Check if reviewfile exists
    const reviewFileExists = fs.existsSync(reviewFilePath);

    if (reviewFileExists) {
      // Read existing reviewfile
      const existingContent = fs.readFileSync(reviewFilePath, "utf-8");

      // Find the export default async function and insert the rule before the closing brace
      // Look for the last closing brace of the main function
      const lines = existingContent.split("\n");
      let insertIndex = lines.length - 1;

      // Find the last closing brace (should be the end of the main function)
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim() === "}") {
          insertIndex = i;
          break;
        }
      }

      // Create the new rule with proper indentation and comments
      const ruleComment = `\n  // Rule: ${description}\n`;
      const indentedCode = cleanedCode
        .split("\n")
        .map((line) => (line.trim() ? `  ${line}` : line))
        .join("\n");

      // Insert the new rule
      lines.splice(insertIndex, 0, ruleComment + indentedCode);

      // Write back to file
      fs.writeFileSync(reviewFilePath, lines.join("\n"), "utf-8");

      console.log(
        chalk.bold.green(`\n✓ Rule added to ${chalk.cyan("reviewfile.ts")}`)
      );
    } else {
      // Create new reviewfile with the rule
      const newReviewFile = `import { warn, fail, message, markdown } from "velvet";

export default async function(review) {
  // Rule: ${description}
${cleanedCode
  .split("\n")
  .map((line) => (line.trim() ? `  ${line}` : line))
  .join("\n")}
}
`;

      fs.writeFileSync(reviewFilePath, newReviewFile, "utf-8");

      console.log(
        chalk.bold.green(
          `\n✓ Created ${chalk.cyan("reviewfile.ts")} with your rule`
        )
      );
    }

    // Suggest next steps
    console.log(chalk.gray("\nNext steps:"));
    console.log(chalk.gray("  • Test your rule: ") + chalk.cyan("velvet local"));
    console.log(
      chalk.gray("  • Add more rules: ") + chalk.cyan("velvet add-rule")
    );
    console.log(
      chalk.gray("  • Edit reviewfile: ") + chalk.cyan("nano reviewfile.ts")
    );
    console.log();
  } catch (error: any) {
    console.error(chalk.red("\n❌ Error generating rule:"));

    if (error.status === 401) {
      console.error(
        chalk.red("Invalid API key. Please check your ANTHROPIC_API_KEY.")
      );
    } else if (error.status === 429) {
      console.error(chalk.red("Rate limit exceeded. Please try again later."));
    } else if (error.code === "ENOTFOUND") {
      console.error(
        chalk.red("Network error. Please check your internet connection.")
      );
    } else {
      console.error(chalk.red(error.message || "Unknown error occurred"));
      if (options.verbose) {
        console.error(chalk.gray(error.stack));
      }
    }

    process.exit(1);
  }
}
