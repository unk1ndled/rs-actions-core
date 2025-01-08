import * as os from 'os';
import * as io from '@actions/io';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

import { Cargo, cargoToolchainArg } from './cargo';

/**
 * Possible arguments to {@link CargoHack.getOrInstall} and
 * {@link CargoHack.install}.
 */
export interface CargoHackOptions {
  /**
   * Toolchain to use when calling `cargo-hack`.
   *
   * If `undefined`, the default toolchain will be used.
   *
   * Note that this toolchain is not used to _install_ `cargo-hack` itself,
   * only to call it once subsequently installed.
   */
  toolchain?: string;

  /**
   * Version of `cargo-hack` to install.
   *
   * If `undefined` or set to `'latest'`, the latest version will be installed.
   */
  version?: string;

  /**
   * Primary cache key to use when caching the installed `cargo-hack`.
   *
   * If `undefined`, a default value will be used.
   * If set to `'no-cache'`, caching will be disabled.
   */
  primaryKey?: string;

  /**
   * Optional additional restore keys to use when looking for an installed
   * version of `cargo-hack`.
   */
  restoreKeys?: string[];
}

export class CargoHack {
  private readonly toolchain: string;

  private constructor(toolchain?: string) {
    this.toolchain = cargoToolchainArg(toolchain);
  }

  /**
   * Gets the installed version of `cargo-hack`, or installs it if not yet installed.
   *
   * @param options Options for getting or installing `cargo-hack`. See
   *                {@link CargoHackOptions}.
   */
  public static async getOrInstall(
    options?: CargoHackOptions,
  ): Promise<CargoHack> {
    try {
      return await CargoHack.get(options?.toolchain);
    } catch (error) {
      core.debug((error as Error).message);
      return await CargoHack.install(options);
    }
  }

  /**
   * Gets the installed version of `cargo-hack`.
   * Throws an exception if not installed.
   *
   * @param toolchain Optional toolchain to use when invoking `cargo-hack`.
   */
  public static async get(toolchain?: string): Promise<CargoHack> {
    // io.which will throw an exception if not installed, but we don't need the path proper.
    await io.which('cargo-hack', true);

    return new CargoHack(toolchain);
  }

  /**
   * Install `cargo-hack` and caches it for future use.
   *
   * @param options Options to use to install `cargo-hack`. See
   *                {@link CargoHackOptions}
   */
  public static async install(options?: CargoHackOptions): Promise<CargoHack> {
    const cargo = await Cargo.get();

    // Compiling cargo-hack might require a version of Rust that the
    // one currently installed and configured, so move to the
    // temp directory (to get the system version of Rust).

    const cwd = process.cwd();
    process.chdir(os.tmpdir());

    try {
      await cargo.install(
        'cargo-hack',
        options?.version,
        options?.primaryKey,
        options?.restoreKeys,
      );

      return new CargoHack(options?.toolchain);
    } finally {
      // It is important to chdir back!
      process.chdir(cwd);
      core.endGroup();
    }
  }

  /**
   * Runs `cargo hack ${args}`.
   *
   * @param args Arguments to pass to `cargo-hack` (after `cargo hack ...`).
   * @param options Optional exec options.
   * @returns `cargo-hack` exit code.
   */
  public async call(
    args: string[],
    options?: exec.ExecOptions,
  ): Promise<number> {
    // cargo-hack is a cargo subcommand so we must actually call it through cargo.
    const cargo = await Cargo.get(this.toolchain);
    return await cargo.call(['hack', ...args], options);
  }
}
