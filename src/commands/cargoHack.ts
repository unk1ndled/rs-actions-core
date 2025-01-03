import * as os from 'os';
import * as io from '@actions/io';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

import { Cargo } from './cargo';

export class CargoHack {
  private readonly path: string;

  private constructor(path: string) {
    this.path = path;
  }

  /**
   * Gets the installed version of `cargo-hack`, or installs
   * the latest version if not yet installed.
   */
  public static async getOrInstall(
    primaryKey?: string,
    restoreKeys?: string[],
  ): Promise<CargoHack> {
    try {
      return await CargoHack.get();
    } catch (error) {
      core.debug((error as Error).message);
      return await CargoHack.install('latest', primaryKey, restoreKeys);
    }
  }

  /**
   * Gets the installed version of `cargo-hack`.
   * Throws an exception if not installed.
   */
  public static async get(): Promise<CargoHack> {
    const path = await io.which('cargo-hack', true);

    return new CargoHack(path);
  }

  /**
   * Install the given version of `cargo-hack` (or the latest
   * version if `version` is `undefined` or `latest`).
   *
   * Caching can be disabled by passing `no-cache` as primary key.
   */
  public static async install(
    version?: string,
    primaryKey?: string,
    restoreKeys?: string[],
  ): Promise<CargoHack> {
    const cargo = await Cargo.get();

    // Compiling cargo-hack might require a version of Rust that the
    // one currently installed and configured, so move to the
    // temp directory (so as to get the system version of Rust).

    const cwd = process.cwd();
    process.chdir(os.tmpdir());

    try {
      const cargoHackPath = await cargo.install(
        'cargo-hack',
        version,
        primaryKey,
        restoreKeys,
      );

      return new CargoHack(cargoHackPath);
    } finally {
      // It is important to chdir back!
      process.chdir(cwd);
      core.endGroup();
    }
  }

  /**
   * Runs `cargo hack ${args}`.
   */
  public async call(
    args: string[],
    options?: exec.ExecOptions,
  ): Promise<number> {
    // We invoke `cargo-hack`, but the executable expects to
    // be called like `cargo`, so we must call `cargo-hack hack ...`
    return await exec.exec(this.path, ['hack', ...args], options);
  }
}
