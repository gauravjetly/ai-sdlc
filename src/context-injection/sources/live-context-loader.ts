/**
 * Live Context Loader
 *
 * Loads current state of the codebase including git status,
 * recent commits, open PRs, and dependencies.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';
import { LiveContext } from '../types/context.types';
import { TokenCounter } from '../utils/token-counter';

export class LiveContextLoader {
  /**
   * Load complete live context
   */
  async load(projectPath: string): Promise<LiveContext> {
    try {
      const git = simpleGit(projectPath);

      const [branch, lastCommit, dependencies, recentChanges] = await Promise.all([
        this.getCurrentBranch(git),
        this.getLastCommit(git),
        this.getDependencies(projectPath),
        this.getRecentChanges(git)
      ]);

      const openPRs = 0; // Would require GitHub API integration

      const content = [
        `Branch: ${branch}`,
        `Last Commit: ${lastCommit}`,
        `Dependencies: ${Object.keys(dependencies).length} packages`,
        `Recent Changes: ${recentChanges.join(', ')}`
      ].join('\n');

      return {
        branch,
        lastCommit,
        openPRs,
        dependencies,
        recentChanges,
        tokens: TokenCounter.count(content)
      };
    } catch (error) {
      console.warn('Failed to load live context:', error);
      return this.getDefaultLiveContext();
    }
  }

  private async getCurrentBranch(git: SimpleGit): Promise<string> {
    try {
      const branch = await git.branchLocal();
      return branch.current;
    } catch {
      return 'main';
    }
  }

  private async getLastCommit(git: SimpleGit): Promise<string> {
    try {
      const log = await git.log({ maxCount: 1 });
      return log.latest?.message || 'No commits';
    } catch {
      return 'No commits';
    }
  }

  private async getDependencies(projectPath: string): Promise<Record<string, string>> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      return {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {})
      };
    } catch {
      return {};
    }
  }

  private async getRecentChanges(git: SimpleGit): Promise<string[]> {
    try {
      const log = await git.log({ maxCount: 5 });
      return log.all.map(commit => commit.message.split('\n')[0] || '');
    } catch {
      return [];
    }
  }

  /**
   * Get modified files in working directory
   */
  async getModifiedFiles(projectPath: string): Promise<string[]> {
    try {
      const git = simpleGit(projectPath);
      const status = await git.status();

      return [
        ...status.modified,
        ...status.created,
        ...status.deleted,
        ...status.renamed.map(r => r.to)
      ];
    } catch {
      return [];
    }
  }

  /**
   * Get untracked files
   */
  async getUntrackedFiles(projectPath: string): Promise<string[]> {
    try {
      const git = simpleGit(projectPath);
      const status = await git.status();
      return status.not_added;
    } catch {
      return [];
    }
  }

  /**
   * Get diff for specific file
   */
  async getFileDiff(projectPath: string, filename: string): Promise<string> {
    try {
      const git = simpleGit(projectPath);
      return await git.diff([filename]);
    } catch {
      return '';
    }
  }

  /**
   * Check if repository is clean
   */
  async isClean(projectPath: string): Promise<boolean> {
    try {
      const git = simpleGit(projectPath);
      const status = await git.status();
      return status.isClean();
    } catch {
      return true;
    }
  }

  private getDefaultLiveContext(): LiveContext {
    return {
      branch: 'main',
      lastCommit: 'No commit information available',
      openPRs: 0,
      dependencies: {},
      recentChanges: [],
      tokens: 0
    };
  }
}
