import { simpleGit, SimpleGit, DiffResult, LogResult } from "simple-git";
import micromatch from "micromatch";
import type { GitDSL, GitCommit, GitDiff, FileMatch } from "./types.js";

export class Git implements GitDSL {
  private git: SimpleGit;
  public modified_files: string[] = [];
  public created_files: string[] = [];
  public deleted_files: string[] = [];
  public commits: GitCommit[] = [];
  public diffs: GitDiff[] = [];

  constructor(repoPath: string = process.cwd()) {
    this.git = simpleGit(repoPath);
  }

  /**
   * Initialize git data by analyzing the current branch against base
   */
  async initialize(base: string = "main"): Promise<void> {
    try {
      // Get the diff summary
      const diffSummary = await this.git.diffSummary([base, "HEAD"]);

      // Categorize files
      for (const file of diffSummary.files) {
        if (file.binary) continue;

        if (file.insertions > 0 && file.deletions === 0) {
          this.created_files.push(file.file);
        } else if (file.deletions > 0 && file.insertions === 0) {
          this.deleted_files.push(file.file);
        } else if (file.insertions > 0 || file.deletions > 0) {
          this.modified_files.push(file.file);
        }

        // Store diff info
        this.diffs.push({
          file: file.file,
          additions: file.insertions,
          deletions: file.deletions,
          changes: file.changes,
        });
      }

      // Get commit history
      const log: LogResult = await this.git.log({
        from: base,
        to: "HEAD",
      });

      this.commits = log.all.map(commit => ({
        sha: commit.hash,
        author: commit.author_name,
        date: new Date(commit.date),
        message: commit.message,
      }));
    } catch (error) {
      console.error("Failed to initialize git data:", error);
      // Continue with empty data rather than failing
    }
  }

  /**
   * Match files by glob pattern(s)
   */
  fileMatch(pattern: string | string[]): FileMatch {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];

    const matchedEdited = micromatch(this.modified_files, patterns);
    const matchedCreated = micromatch(this.created_files, patterns);
    const matchedDeleted = micromatch(this.deleted_files, patterns);

    return {
      edited: matchedEdited,
      created: matchedCreated,
      deleted: matchedDeleted,
      matches: (p: string) => {
        const allFiles = [
          ...this.modified_files,
          ...this.created_files,
          ...this.deleted_files,
        ];
        return micromatch(allFiles, p).length > 0;
      },
      getAll: () => [...matchedEdited, ...matchedCreated],
    };
  }

  /**
   * Get all changed files (modified + created)
   */
  getChangedFiles(): string[] {
    return [...this.modified_files, ...this.created_files];
  }

  /**
   * Check if any files match the pattern
   */
  hasChanges(pattern: string | string[]): boolean {
    const match = this.fileMatch(pattern);
    return (
      match.edited.length > 0 ||
      match.created.length > 0 ||
      match.deleted.length > 0
    );
  }

  /**
   * Get diff for a specific file
   */
  async getFileDiff(file: string): Promise<string> {
    try {
      const diff = await this.git.diff(["HEAD~1", "HEAD", "--", file]);
      return diff;
    } catch (error) {
      return "";
    }
  }
}
