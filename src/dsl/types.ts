/**
 * Core type definitions for the Review DSL
 */

// File matching interface
export interface FileMatch {
  /** Files that were edited */
  edited: string[];
  /** Files that were created */
  created: string[];
  /** Files that were deleted */
  deleted: string[];
  /** Check if any files match the pattern */
  matches(pattern: string): boolean;
  /** Get all files (edited + created) */
  getAll(): string[];
}

// Git metadata
export interface GitCommit {
  sha: string;
  author: string;
  date: Date;
  message: string;
}

export interface GitDiff {
  file: string;
  additions: number;
  deletions: number;
  changes: number;
}

export interface GitDSL {
  /** Files that were modified */
  modified_files: string[];
  /** Files that were created */
  created_files: string[];
  /** Files that were deleted */
  deleted_files: string[];
  /** Commit information */
  commits: GitCommit[];
  /** Diff information */
  diffs: GitDiff[];
  /** Match files by glob pattern */
  fileMatch(pattern: string | string[]): FileMatch;
}

// GitHub PR metadata
export interface GitHubPR {
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
  author: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  base: {
    ref: string;
    sha: string;
  };
  head: {
    ref: string;
    sha: string;
  };
}

export interface GitHubReview {
  id: number;
  user: {
    login: string;
  };
  body: string;
  state: string;
  submitted_at: string;
}

export interface GitHubComment {
  id: number;
  user: {
    login: string;
  };
  body: string;
  created_at: string;
  path?: string;
  line?: number;
}

export interface GitHubDSL {
  /** Pull request metadata */
  pr: GitHubPR;
  /** Reviews on the PR */
  reviews: GitHubReview[];
  /** Comments on the PR */
  comments: GitHubComment[];
  /** Check if PR title matches pattern */
  titleMatches(pattern: string | RegExp): boolean;
  /** Check if PR has label */
  hasLabel(label: string): boolean;
  /** Get assignees */
  getAssignees(): string[];
}

// Main Review DSL object
export interface ReviewDSL {
  /** Git metadata and operations */
  git: GitDSL;
  /** GitHub PR metadata and operations */
  github?: GitHubDSL;
  /** Check if running in GitHub Actions */
  isGitHub: boolean;
  /** Environment variables */
  env: Record<string, string | undefined>;
}

// Result types
export type ResultLevel = "message" | "warn" | "fail";

export interface ReviewResult {
  level: ResultLevel;
  message: string;
  file?: string;
  line?: number;
  markdown?: boolean;
}

export interface ReviewResults {
  messages: ReviewResult[];
  warnings: ReviewResult[];
  failures: ReviewResult[];
  markdowns: string[];
}
