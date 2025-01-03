import * as os from 'os';
import * as io from '@actions/io';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

import { Cargo } from './cargo';

export class Cross {
  private readonly path: string;

  private constructor(path: string) {
    this.path = path;
  }

  /**
   * Gets the installed version of `cross`, or installs
   * it if not yet installed.
   */
  public static async getOrInstall(
    primaryKey?: string,
    restoreKeys?: string[],
  ): Promise<Cross> {
    try {
      return await Cross.get();
    } catch (error) {
      core.debug((error as Error).message);
      return await Cross.install('latest', primaryKey, restoreKeys);
    }
  }

  /**
   * Gets the installed version of `cross`.
   * Throws an exception if not installed.
   */
  public static async get(): Promise<Cross> {
    const path = await io.which('cross', true);

    return new Cross(path);
  }

  /**
   * Install the given version of `cross` (or the latest
   * version if `version` is `undefined` or `latest`).
   *
   * Caching can be disabled by passing `no-cache` as primary key.
   */
  public static async install(
    version?: string,
    primaryKey?: string,
    restoreKeys?: string[],
  ): Promise<Cross> {
    const cargo = await Cargo.get();

    // Compiling cross might require a version of Rust that the
    // one currently installed and configured, so move to the
    // temp directory (so as to get the system version of Rust).

    const cwd = process.cwd();
    process.chdir(os.tmpdir());

    try {
      const crossPath = await cargo.install(
        'cross',
        version,
        primaryKey,
        restoreKeys,
      );

      return new Cross(crossPath);
    } finally {
      // It is important to chdir back!
      process.chdir(cwd);
      core.endGroup();
    }
  }

  /**
   * Runs a cross command.
   */
  public async call(
    args: string[],
    options?: exec.ExecOptions,
  ): Promise<number> {
    return await exec.exec(this.path, args, options);
  }
}
