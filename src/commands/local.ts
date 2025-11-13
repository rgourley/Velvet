import chalk from "chalk";
import ora from "ora";
import { RuleEvaluator } from "../engine/evaluator.js";

interface LocalOptions {
  base?: string;
  reviewfile?: string;
  verbose?: boolean;
}

/**
 * Local command - Run review on local git changes without GitHub
 * Perfect for testing rules before pushing to PR
 */
export async function localCommand(options: LocalOptions): Promise<void> {
  const spinner = ora("Initializing local review...").start();

  try {
    const baseBranch = options.base || "main";
    const reviewFilePath = options.reviewfile || "./reviewfile.ts";

    spinner.text = `Comparing against ${baseBranch}...`;

    // Create evaluator with GitHub disabled
    const evaluator = new RuleEvaluator({
      reviewFilePath,
      baseBranch,
      enableGitHub: false, // Force GitHub off for local testing
    });

    // Run evaluation
    const result = await evaluator.evaluate();

    spinner.succeed(chalk.green("Local review completed!"));

    // Show verbose info
    if (options.verbose) {
      console.log(chalk.gray(`\n📁 Repository: ${process.cwd()}`));
      console.log(chalk.gray(`📋 Reviewfile: ${reviewFilePath}`));
      console.log(chalk.gray(`🌿 Base branch: ${baseBranch}`));
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

      // Show changed files
      if (result.review.git.modified_files.length > 0) {
        console.log(chalk.gray("\n📝 Modified:"));
        result.review.git.modified_files.forEach(file => {
          console.log(chalk.gray(`   - ${file}`));
        });
      }

      if (result.review.git.created_files.length > 0) {
        console.log(chalk.gray("\n✨ Created:"));
        result.review.git.created_files.forEach(file => {
          console.log(chalk.gray(`   - ${file}`));
        });
      }
    }

    // Display results
    console.log("\n" + result.results.formatForTerminal());

    // Show tip for GitHub
    if (result.passed) {
      console.log(result.results.getStatusMessage());
      console.log(
        chalk.gray(
          "\n💡 Tip: Run 'review-ai run' in CI to post results to GitHub PR"
        )
      );
    } else {
      console.log(result.results.getStatusMessage());
      console.log(
        chalk.gray("\n🔧 Fix the issues above before pushing your changes")
      );
    }

    // Exit with appropriate code
    process.exit(result.exitCode);
  } catch (error) {
    spinner.fail(chalk.red("Local review failed"));

    if (error instanceof Error) {
      console.error(chalk.red("\n" + error.message));

      // Show helpful tips for common errors
      if (error.message.includes("not found")) {
        console.log(
          chalk.yellow(
            "\n💡 Tip: Create a reviewfile with: review-ai init"
          )
        );
      }

      if (error.message.includes("main")) {
        console.log(
          chalk.yellow(
            `\n💡 Tip: Specify a different base branch with: --base <branch>`
          )
        );
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
