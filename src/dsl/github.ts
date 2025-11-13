import { Octokit } from "@octokit/rest";
import type {
  GitHubDSL,
  GitHubPR,
  GitHubReview,
  GitHubComment,
} from "./types.js";

export class GitHub implements GitHubDSL {
  private octokit: Octokit;
  public pr!: GitHubPR;
  public reviews: GitHubReview[] = [];
  public comments: GitHubComment[] = [];
  private owner: string = "";
  private repo: string = "";
  private prNumber: number = 0;

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Initialize GitHub data from environment
   */
  async initialize(): Promise<void> {
    // Parse GitHub repository info from environment
    const githubRepo = process.env.GITHUB_REPOSITORY;
    const prNumberStr =
      process.env.GITHUB_PR_NUMBER || this.extractPRNumberFromRef();

    if (!githubRepo || !prNumberStr) {
      throw new Error(
        "Missing GitHub environment variables. Set GITHUB_REPOSITORY and GITHUB_PR_NUMBER"
      );
    }

    [this.owner, this.repo] = githubRepo.split("/");
    this.prNumber = parseInt(prNumberStr, 10);

    // Fetch PR data
    await this.fetchPR();
    await this.fetchReviews();
    await this.fetchComments();
  }

  /**
   * Extract PR number from GitHub ref (e.g., refs/pull/123/merge)
   */
  private extractPRNumberFromRef(): string | null {
    const ref = process.env.GITHUB_REF;
    if (!ref) return null;

    const match = ref.match(/refs\/pull\/(\d+)\//);
    return match ? match[1] : null;
  }

  /**
   * Fetch pull request data
   */
  private async fetchPR(): Promise<void> {
    const { data } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.prNumber,
    });

    this.pr = {
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state,
      html_url: data.html_url,
      additions: data.additions,
      deletions: data.deletions,
      changed_files: data.changed_files,
      author: {
        login: data.user?.login || "unknown",
        avatar_url: data.user?.avatar_url || "",
        html_url: data.user?.html_url || "",
      },
      created_at: data.created_at,
      updated_at: data.updated_at,
      merged_at: data.merged_at,
      base: {
        ref: data.base.ref,
        sha: data.base.sha,
      },
      head: {
        ref: data.head.ref,
        sha: data.head.sha,
      },
    };
  }

  /**
   * Fetch reviews for the PR
   */
  private async fetchReviews(): Promise<void> {
    const { data } = await this.octokit.pulls.listReviews({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.prNumber,
    });

    this.reviews = data.map(review => ({
      id: review.id,
      user: {
        login: review.user?.login || "unknown",
      },
      body: review.body || "",
      state: review.state,
      submitted_at: review.submitted_at || "",
    }));
  }

  /**
   * Fetch comments for the PR
   */
  private async fetchComments(): Promise<void> {
    // Get issue comments
    const { data: issueComments } = await this.octokit.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.prNumber,
    });

    // Get review comments
    const { data: reviewComments } =
      await this.octokit.pulls.listReviewComments({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.prNumber,
      });

    this.comments = [
      ...issueComments.map(comment => ({
        id: comment.id,
        user: {
          login: comment.user?.login || "unknown",
        },
        body: comment.body || "",
        created_at: comment.created_at,
      })),
      ...reviewComments.map(comment => ({
        id: comment.id,
        user: {
          login: comment.user?.login || "unknown",
        },
        body: comment.body || "",
        created_at: comment.created_at,
        path: comment.path,
        line: comment.line || undefined,
      })),
    ];
  }

  /**
   * Check if PR title matches pattern
   */
  titleMatches(pattern: string | RegExp): boolean {
    if (typeof pattern === "string") {
      return this.pr.title.includes(pattern);
    }
    return pattern.test(this.pr.title);
  }

  /**
   * Check if PR has a specific label
   */
  hasLabel(label: string): boolean {
    // This would require fetching labels, simplified for now
    return false;
  }

  /**
   * Get PR assignees
   */
  getAssignees(): string[] {
    // This would require fetching assignees, simplified for now
    return [];
  }

  /**
   * Post a comment to the PR
   */
  async postComment(body: string): Promise<void> {
    await this.octokit.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.prNumber,
      body,
    });
  }

  /**
   * Check if the PR is a draft
   */
  isDraft(): boolean {
    return (this.pr as any).draft === true;
  }

  /**
   * Check if the PR is mergeable
   */
  isMergeable(): boolean {
    return (this.pr as any).mergeable === true;
  }
}
