import { describe, it, expect, beforeEach, vi } from "vitest";
import { Git } from "./git.js";
import type { DiffResult } from "simple-git";

// Mock simple-git
vi.mock("simple-git", () => ({
  simpleGit: vi.fn(() => ({
    diffSummary: vi.fn(),
    log: vi.fn(),
  })),
}));

describe("Git DSL", () => {
  let git: Git;

  beforeEach(() => {
    git = new Git();
    vi.clearAllMocks();
  });

  describe("File Parsing", () => {
    it("should parse modified files correctly", async () => {
      const mockDiffSummary: DiffResult = {
        changed: 3,
        deletions: 10,
        insertions: 20,
        files: [
          {
            file: "src/app.ts",
            changes: 5,
            insertions: 3,
            deletions: 2,
            binary: false,
          },
          {
            file: "src/utils.ts",
            changes: 8,
            insertions: 5,
            deletions: 3,
            binary: false,
          },
          {
            file: "README.md",
            changes: 2,
            insertions: 2,
            deletions: 0,
            binary: false,
          },
        ],
      };

      // Mock the git instance
      const mockGit = {
        diffSummary: vi.fn().mockResolvedValue(mockDiffSummary),
        log: vi.fn().mockResolvedValue({ all: [] }),
      };
      (git as any).git = mockGit;

      await git.initialize("main");

      // src/app.ts and src/utils.ts have both insertions and deletions → modified
      expect(git.modified_files).toHaveLength(2);
      expect(git.modified_files).toContain("src/app.ts");
      expect(git.modified_files).toContain("src/utils.ts");

      // README.md has only insertions → created
      expect(git.created_files).toHaveLength(1);
      expect(git.created_files).toContain("README.md");
    });

    it("should categorize created files", async () => {
      const mockDiffSummary: DiffResult = {
        changed: 2,
        deletions: 0,
        insertions: 50,
        files: [
          {
            file: "src/new-feature.ts",
            changes: 30,
            insertions: 30,
            deletions: 0,
            binary: false,
          },
          {
            file: "src/another-new.ts",
            changes: 20,
            insertions: 20,
            deletions: 0,
            binary: false,
          },
        ],
      };

      const mockGit = {
        diffSummary: vi.fn().mockResolvedValue(mockDiffSummary),
        log: vi.fn().mockResolvedValue({ all: [] }),
      };
      (git as any).git = mockGit;

      await git.initialize("main");

      expect(git.created_files).toHaveLength(2);
      expect(git.created_files).toContain("src/new-feature.ts");
      expect(git.created_files).toContain("src/another-new.ts");
    });

    it("should categorize deleted files", async () => {
      const mockDiffSummary: DiffResult = {
        changed: 1,
        deletions: 25,
        insertions: 0,
        files: [
          {
            file: "src/old-code.ts",
            changes: 25,
            insertions: 0,
            deletions: 25,
            binary: false,
          },
        ],
      };

      const mockGit = {
        diffSummary: vi.fn().mockResolvedValue(mockDiffSummary),
        log: vi.fn().mockResolvedValue({ all: [] }),
      };
      (git as any).git = mockGit;

      await git.initialize("main");

      expect(git.deleted_files).toHaveLength(1);
      expect(git.deleted_files).toContain("src/old-code.ts");
    });

    it("should handle empty diffs", async () => {
      const mockDiffSummary: DiffResult = {
        changed: 0,
        deletions: 0,
        insertions: 0,
        files: [],
      };

      const mockGit = {
        diffSummary: vi.fn().mockResolvedValue(mockDiffSummary),
        log: vi.fn().mockResolvedValue({ all: [] }),
      };
      (git as any).git = mockGit;

      await git.initialize("main");

      expect(git.modified_files).toHaveLength(0);
      expect(git.created_files).toHaveLength(0);
      expect(git.deleted_files).toHaveLength(0);
      expect(git.diffs).toHaveLength(0);
    });
  });

  describe("fileMatch()", () => {
    beforeEach(async () => {
      const mockDiffSummary: DiffResult = {
        changed: 6,
        deletions: 5,
        insertions: 50,
        files: [
          {
            file: "src/app.ts",
            changes: 10,
            insertions: 8,
            deletions: 2,
            binary: false,
          },
          {
            file: "src/utils/helper.ts",
            changes: 15,
            insertions: 10,
            deletions: 5,
            binary: false,
          },
          {
            file: "src/new-feature.ts",
            changes: 20,
            insertions: 20,
            deletions: 0,
            binary: false,
          },
          {
            file: "tests/app.test.ts",
            changes: 12,
            insertions: 12,
            deletions: 0,
            binary: false,
          },
          {
            file: "README.md",
            changes: 3,
            insertions: 2,
            deletions: 1,
            binary: false,
          },
          {
            file: "old-file.ts",
            changes: 5,
            insertions: 0,
            deletions: 5,
            binary: false,
          },
        ],
      };

      const mockGit = {
        diffSummary: vi.fn().mockResolvedValue(mockDiffSummary),
        log: vi.fn().mockResolvedValue({ all: [] }),
      };
      (git as any).git = mockGit;

      await git.initialize("main");
    });

    it("should match files with simple glob", () => {
      const match = git.fileMatch("**/*.ts");

      expect(match.edited).toHaveLength(2); // app.ts, helper.ts
      expect(match.created).toHaveLength(2); // new-feature.ts, app.test.ts
      expect(match.deleted).toHaveLength(1); // old-file.ts
    });

    it("should match files with specific pattern", () => {
      const match = git.fileMatch("src/**/*.ts");

      expect(match.edited).toContain("src/app.ts");
      expect(match.edited).toContain("src/utils/helper.ts");
      expect(match.created).toContain("src/new-feature.ts");
      expect(match.edited).not.toContain("tests/app.test.ts");
    });

    it("should match test files", () => {
      const match = git.fileMatch("**/*.test.ts");

      expect(match.created).toHaveLength(1);
      expect(match.created).toContain("tests/app.test.ts");
    });

    it("should match markdown files", () => {
      const match = git.fileMatch("*.md");

      expect(match.edited).toHaveLength(1);
      expect(match.edited).toContain("README.md");
    });

    it("should handle multiple patterns", () => {
      const match = git.fileMatch(["**/*.test.ts", "*.md"]);

      expect(match.getAll()).toHaveLength(2);
      expect(match.getAll()).toContain("tests/app.test.ts");
      expect(match.getAll()).toContain("README.md");
    });

    it("should return empty match for non-matching pattern", () => {
      const match = git.fileMatch("**/*.jsx");

      expect(match.edited).toHaveLength(0);
      expect(match.created).toHaveLength(0);
      expect(match.deleted).toHaveLength(0);
    });

    it("should support matches() method", () => {
      const match = git.fileMatch("src/**/*.ts");

      expect(match.matches("src/**/*.ts")).toBe(true);
      // matches() checks against all files in git, not just the matched files
      expect(match.matches("**/*.test.ts")).toBe(true); // tests/app.test.ts exists
      expect(match.matches("**/*.jsx")).toBe(false); // no jsx files exist
    });
  });

  describe("hasChanges()", () => {
    beforeEach(async () => {
      const mockDiffSummary: DiffResult = {
        changed: 3,
        deletions: 0,
        insertions: 30,
        files: [
          {
            file: "src/app.ts",
            changes: 10,
            insertions: 10,
            deletions: 0,
            binary: false,
          },
          {
            file: "docs/README.md",
            changes: 5,
            insertions: 5,
            deletions: 0,
            binary: false,
          },
          {
            file: "package.json",
            changes: 2,
            insertions: 2,
            deletions: 0,
            binary: false,
          },
        ],
      };

      const mockGit = {
        diffSummary: vi.fn().mockResolvedValue(mockDiffSummary),
        log: vi.fn().mockResolvedValue({ all: [] }),
      };
      (git as any).git = mockGit;

      await git.initialize("main");
    });

    it("should return true when pattern matches files", () => {
      expect(git.hasChanges("src/**/*")).toBe(true);
      expect(git.hasChanges("package.json")).toBe(true);
      expect(git.hasChanges("docs/**/*.md")).toBe(true);
    });

    it("should return false when pattern doesn't match", () => {
      expect(git.hasChanges("tests/**/*")).toBe(false);
      expect(git.hasChanges("**/*.test.ts")).toBe(false);
    });
  });

  describe("Commits", () => {
    it("should parse commit history", async () => {
      const mockDiffSummary: DiffResult = {
        changed: 0,
        deletions: 0,
        insertions: 0,
        files: [],
      };

      const mockLog = {
        all: [
          {
            hash: "abc123",
            date: "2024-01-01",
            message: "feat: add new feature",
            author_name: "John Doe",
            author_email: "john@example.com",
          },
          {
            hash: "def456",
            date: "2024-01-02",
            message: "fix: resolve bug",
            author_name: "Jane Smith",
            author_email: "jane@example.com",
          },
        ],
      };

      const mockGit = {
        diffSummary: vi.fn().mockResolvedValue(mockDiffSummary),
        log: vi.fn().mockResolvedValue(mockLog),
      };
      (git as any).git = mockGit;

      await git.initialize("main");

      expect(git.commits).toHaveLength(2);
      expect(git.commits[0].message).toBe("feat: add new feature");
      expect(git.commits[1].message).toBe("fix: resolve bug");
    });
  });
});
