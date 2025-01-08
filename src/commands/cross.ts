import * as os from 'os';
import * as io from '@actions/io';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

import { Cargo, cargoToolchainArg } from './cargo';

/**
 * Possible arguments to {@link Cross.getOrInstall} and
 * {@link Cross.install}.
 */
export interface CrossOptions {
  /**
   * Toolchain to use when calling `cross`.
   *
   * If `undefined`, the default toolchain will be used.
   *
   * Note that this toolchain is not used to _install_ `cross` itself,
   * only to call it once subsequently installed.
   */
  toolchain?: string;

  /**
   * Version of `cross` to install.
   *
   * If `undefined` or set to `'latest'`, the latest version will be installed.
   */
  version?: string;

  /**
   * Primary cache key to use when caching the installed `cross`.
   *
   * If `undefined`, a default value will be used.
   * If set to `'no-cache'`, caching will be disabled.
   */
  primaryKey?: string;

  /**
   * Optional additional restore keys to use when looking for an installed
   * version of `cross`.
   */
  restoreKeys?: string[];
}

export class Cross {
  private readonly path: string;
  private readonly toolchain: string;

  private constructor(path: string, toolchain?: string) {
    this.path = path;
    this.toolchain = cargoToolchainArg(toolchain);
  }

  /**
   * Gets the installed version of `cross`, or installs it if not yet installed.
   *
   * @param options Options for getting or installing `cross`. See {@link CrossOptions}.
   */
  public static async getOrInstall(options?: CrossOptions): Promise<Cross> {
    try {
      return await Cross.get(options?.toolchain);
    } catch (error) {
      core.debug((error as Error).message);
      return await Cross.install(options);
    }
  }

  /**
   * Gets the installed version of `cross`.
   * Throws an exception if not installed.
   *
   * @param toolchain Optional toolchain to use when invoking `cross`.
   */
  public static async get(toolchain?: string): Promise<Cross> {
    const path = await io.which('cross', true);

    return new Cross(path, toolchain);
  }

  /**
   * Install `cross` and caches it for future use.
   *
   * @param options Options for getting or installing `cross`. See {@link CrossOptions}.
   */
  public static async install(options?: CrossOptions): Promise<Cross> {
    const cargo = await Cargo.get();

    // Compiling cross might require a version of Rust that the
    // one currently installed and configured, so move to the
    // temp directory (to get the system version of Rust).

    const cwd = process.cwd();
    process.chdir(os.tmpdir());

    try {
      const crossPath = await cargo.install(
        'cross',
        options?.version,
        options?.primaryKey,
        options?.restoreKeys,
      );

      return new Cross(crossPath, options?.toolchain);
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
    return await exec.exec(this.path, this.callArgs(args), options);
  }

  private callArgs(args: string[]): string[] {
    return this.toolchain ? [this.toolchain, ...args] : args;
  }
}
