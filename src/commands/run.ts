import chalk from "chalk";
import ora from "ora";
import { RuleEvaluator } from "../engine/evaluator.js";
import { GitHub } from "../dsl/github.js";

interface RunOptions {
  owner?: string;
  repo?: string;
  pr?: string;
  base?: string;
  reviewfile?: string;
  verbose?: boolean;
  post?: boolean; // Whether to post comment to GitHub
  dryRun?: boolean; // Show what would be posted without posting
}

/**
 * Run command - Execute review for a GitHub PR
 * Typically used in CI/CD pipelines
 */
export async function runCommand(options: RunOptions): Promise<void> {
  const spinner = ora("Initializing GitHub PR review...").start();

  try {
    // Determine GitHub context
    const owner =
      options.owner || process.env.GITHUB_REPOSITORY?.split("/")[0];
    const repo = options.repo || process.env.GITHUB_REPOSITORY?.split("/")[1];
    const prNumber =
      options.pr || process.env.GITHUB_PR_NUMBER || extractPRFromRef();
    const token = process.env.GITHUB_TOKEN;

    // Validate GitHub context
    if (!owner || !repo || !prNumber) {
      throw new Error(
        "Missing GitHub context. Provide --owner, --repo, and --pr, or set GITHUB_REPOSITORY and GITHUB_PR_NUMBER environment variables."
      );
    }

    if (!token && options.post !== false) {
      console.log(
        chalk.yellow(
          "\n⚠️  Warning: GITHUB_TOKEN not set. Results will only be printed locally."
        )
      );
      console.log(
        chalk.gray("   Set GITHUB_TOKEN to post results as PR comments.\n")
      );
      options.post = false;
    }

    spinner.text = `Fetching PR #${prNumber} from ${owner}/${repo}...`;

    // Set environment variables for GitHub DSL
    process.env.GITHUB_REPOSITORY = `${owner}/${repo}`;
    process.env.GITHUB_PR_NUMBER = prNumber;

    // Determine base branch
    const baseBranch = options.base || "main";
    const reviewFilePath = options.reviewfile || "./reviewfile.ts";

    // Create evaluator with GitHub enabled
    const evaluator = new RuleEvaluator({
      reviewFilePath,
      baseBranch,
      enableGitHub: true,
    });

    spinner.text = "Running review rules...";

    // Run evaluation
    const result = await evaluator.evaluate();

    spinner.succeed(chalk.green("Review completed!"));

    // Show PR info
    if (result.review.github && options.verbose) {
      const pr = result.review.github.pr;
      console.log(chalk.gray(`\n🔗 PR: ${pr.html_url}`));
      console.log(chalk.gray(`📝 Title: ${pr.title}`));
      console.log(chalk.gray(`👤 Author: ${pr.author.login}`));
      console.log(chalk.gray(`+${pr.additions} -${pr.deletions} changes`));
      console.log(
        chalk.gray(`📦 ${result.review.git.commits.length} commit(s)`)
      );
    }

    // Display results
    console.log("\n" + result.results.formatForTerminal());

    // Post to GitHub if enabled
    if (options.post && token && !options.dryRun) {
      spinner.start("Posting results to GitHub...");

      try {
        const github = new GitHub(token);
        await github.initialize();

        const markdown = result.results.formatAsMarkdown();
        await github.postComment(markdown);

        spinner.succeed(chalk.green("Posted comment to GitHub PR!"));
      } catch (error) {
        spinner.warn(chalk.yellow("Failed to post comment to GitHub"));
        if (error instanceof Error) {
          console.error(chalk.yellow(`  ${error.message}`));
        }
      }
    } else if (options.dryRun) {
      console.log(chalk.blue("\n📝 Dry run - Comment that would be posted:"));
      console.log(chalk.gray("─".repeat(50)));
      console.log(result.results.formatAsMarkdown());
      console.log(chalk.gray("─".repeat(50)));
    }

    // Show status
    console.log(result.results.getStatusMessage());

    // Exit with appropriate code
    process.exit(result.exitCode);
  } catch (error) {
    spinner.fail(chalk.red("Review failed"));

    if (error instanceof Error) {
      console.error(chalk.red("\n" + error.message));

      // Helpful error messages
      if (error.message.includes("GITHUB_TOKEN")) {
        console.log(chalk.yellow("\n💡 Set GITHUB_TOKEN environment variable:"));
        console.log(chalk.gray("   export GITHUB_TOKEN=ghp_your_token_here"));
      }

      if (error.message.includes("GitHub context")) {
        console.log(chalk.yellow("\n💡 Usage in GitHub Actions:"));
        console.log(
          chalk.gray(`
  - name: Run Code Review
    run: review-ai run
    env:
      GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`)
        );
        console.log(chalk.yellow("💡 Manual usage:"));
        console.log(
          chalk.gray(
            "   review-ai run --owner myorg --repo myrepo --pr 123"
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

/**
 * Extract PR number from GITHUB_REF (e.g., refs/pull/123/merge)
 */
function extractPRFromRef(): string | undefined {
  const ref = process.env.GITHUB_REF;
  if (!ref) return undefined;

  const match = ref.match(/refs\/pull\/(\d+)\//);
  return match ? match[1] : undefined;
}
