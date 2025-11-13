import chalk from "chalk";
import ora from "ora";
import { RuleEvaluator } from "../engine/evaluator.js";
import { getExampleReviewFile } from "../engine/loader.js";

interface ReviewOptions {
  base?: string;
  verbose?: boolean;
  github?: boolean;
}

export async function reviewCommand(
  reviewFilePath: string = "./reviewfile.ts",
  options: ReviewOptions
): Promise<void> {
  const spinner = ora("Initializing review...").start();

  try {
    // Create evaluator
    const evaluator = new RuleEvaluator({
      reviewFilePath,
      baseBranch: options.base || "main",
      enableGitHub: options.github !== false,
    });

    // Run evaluation
    spinner.text = "Loading review context...";
    const result = await evaluator.evaluate();

    // Show verbose info
    if (options.verbose) {
      console.log(chalk.gray(`\n📁 Repository: ${process.cwd()}`));
      console.log(
        chalk.gray(
          `📝 Modified files: ${result.review.git.modified_files.length}`
        )
      );
      console.log(
        chalk.gray(
          `✨ Created files: ${result.review.git.created_files.length}`
        )
      );
      console.log(
        chalk.gray(
          `🗑️  Deleted files: ${result.review.git.deleted_files.length}`
        )
      );
      console.log(
        chalk.gray(`📦 Commits: ${result.review.git.commits.length}`)
      );

      if (result.review.github) {
        console.log(
          chalk.gray(
            `\n🔗 GitHub PR #${result.review.github.pr.number}: ${result.review.github.pr.title}`
          )
        );
        console.log(
          chalk.gray(
            `   +${result.review.github.pr.additions} -${result.review.github.pr.deletions} changes`
          )
        );
      }
    }

    spinner.succeed(chalk.green("Review completed!"));

    // Display results
    console.log("\n" + result.results.formatForTerminal());
    console.log(result.results.getStatusMessage());

    // Exit with appropriate code
    process.exit(result.exitCode);
  } catch (error) {
    spinner.fail(chalk.red("Review failed"));

    if (error instanceof Error) {
      console.error(chalk.red("\n" + error.message));

      // Show example if reviewfile not found
      if (error.message.includes("not found")) {
        console.log(chalk.yellow("\nCreate a reviewfile.ts with:"));
        console.log(chalk.gray("\n" + getExampleReviewFile()));
        console.log(chalk.yellow("\nOr run: review-ai init"));
      }

      if (options.verbose && error.stack) {
        console.error(chalk.gray("\nStack trace:"));
        console.error(chalk.gray(error.stack));
      }
    } else {
      console.error(chalk.red("\nUnknown error occurred"));
    }

    process.exit(1);
  }
}
