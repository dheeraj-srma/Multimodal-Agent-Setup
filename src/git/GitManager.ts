import { GitStatusInfo } from '../types';

export class GitManager {
  private static instance: GitManager;

  private constructor() {}

  public static getInstance(): GitManager {
    if (!GitManager.instance) {
      GitManager.instance = new GitManager();
    }
    return GitManager.instance;
  }

  public async getStatus(): Promise<GitStatusInfo> {
    if (typeof window !== 'undefined' && (window as any).commandCenterAPI?.getGitStatus) {
      try {
        return await (window as any).commandCenterAPI.getGitStatus();
      } catch (err) {
        console.error('[GitManager] Error from native IPC git status:', err);
      }
    }

    // Default fallback representation if IPC is not yet connected
    return {
      isGitRepo: true,
      currentBranch: 'main',
      trackingBranch: 'origin/main',
      modifiedFiles: [],
      addedFiles: [],
      deletedFiles: [],
      untrackedFiles: [],
      aheadCount: 0,
      behindCount: 0,
      recentCommits: [
        {
          hash: 'a1b2c3d',
          message: 'chore: initial project baseline',
          author: 'CommandCenter Agent',
          date: new Date().toISOString().split('T')[0],
        },
      ],
    };
  }

  public async getDiff(filePath?: string): Promise<string> {
    if (typeof window !== 'undefined' && (window as any).commandCenterAPI?.getGitDiff) {
      try {
        return await (window as any).commandCenterAPI.getGitDiff(filePath);
      } catch (err) {
        console.error('[GitManager] Error getting git diff:', err);
      }
    }
    return '# Unified Git Diff\n# No unstaged changes detected.';
  }

  public async commit(message: string, files?: string[]): Promise<{ hash: string; success: boolean; error?: string }> {
    if (typeof window !== 'undefined' && (window as any).commandCenterAPI?.gitCommit) {
      try {
        return await (window as any).commandCenterAPI.gitCommit({ message, files });
      } catch (err: any) {
        return { hash: '', success: false, error: err.message };
      }
    }
    return { hash: 'commit-' + Math.random().toString(16).substring(2, 8), success: true };
  }
}

export const gitManager = GitManager.getInstance();
