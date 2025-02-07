import * as github from '@actions/github';

// `@actions/github` does not re-export `GitHub` type, thanks for nothing.
type GitHub = any; // eslint-disable-line @typescript-eslint/no-explicit-any

interface Output {
  title: string;
  summary: string;
  text: string;
}

/**
 * Thin wrapper around the GitHub Checks API
 */
export class CheckReporter {
  private readonly client: GitHub;
  private readonly checkName: string;
  private checkId: undefined | number;

  constructor(client: GitHub, checkName: string) {
    this.client = client; // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    this.checkName = checkName;
    this.checkId = undefined;
  }

  /**
   * Starts a new Check and returns check ID.
   */
  public async startCheck(
    status?: 'queued' | 'in_progress' | 'completed',
  ): Promise<number> {
    const { owner, repo } = github.context.repo;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const response = await this.client.checks.create({
      owner: owner,
      repo: repo,
      name: this.checkName,
      head_sha: github.context.sha,
      status: status ?? 'in_progress',
    });
    // TODO: Check for errors

    this.checkId = response.data.id; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    return this.checkId!;
  }

  // TODO:
  //     public async sendAnnotations(annotations: Array<octokit.ChecksCreateParamsOutputAnnotations>): Promise<void> {
  //     }

  /**
   * It is up to caller to call the `startCheck` first!
   */
  public async finishCheck(
    conclusion:
      | 'cancelled'
      | 'success'
      | 'failure'
      | 'neutral'
      | 'timed_out'
      | 'action_required',
    output: Output,
  ): Promise<void> {
    const { owner, repo } = github.context.repo;

    // TODO: Check for errors
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await this.client.checks.update({
      owner: owner,
      repo: repo,
      name: this.checkName,
      check_run_id: this.checkId!,
      status: 'completed',
      conclusion: conclusion,
      completed_at: new Date().toISOString(),
      output: output,
    });

    return;
  }

  public async cancelCheck(): Promise<void> {
    const { owner, repo } = github.context.repo;

    // TODO: Check for errors
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await this.client.checks.update({
      owner: owner,
      repo: repo,
      name: this.checkName,
      check_run_id: this.checkId!,
      status: 'completed',
      conclusion: 'cancelled',
      completed_at: new Date().toISOString(),
      output: {
        title: this.checkName,
        summary: 'Unhandled error',
        text: 'Check was cancelled due to unhandled error. Check the Action logs for details.',
      },
    });

    return;
  }
}
