import * as io from '@actions/io';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

import { Cargo } from './cargo';

export class CargoHack {
  private readonly path: string;

  private constructor(path: string) {
    this.path = path;
  }

  public static async getOrInstall(): Promise<CargoHack> {
    try {
      return await CargoHack.get();
    } catch (error) {
      core.debug((error as Error).message);
      return await CargoHack.install();
    }
  }

  public static async get(): Promise<CargoHack> {
    const path = await io.which('cargo-hack', true);

    return new CargoHack(path);
  }

  public static async install(version?: string): Promise<CargoHack> {
    const cargo = await Cargo.get();

    try {
      const path = await cargo.installCached('cargo-hack', version);
      return new CargoHack(path);
    } finally {
      core.endGroup();
    }
  }

  public async call(
    args: string[],
    options?: exec.ExecOptions,
  ): Promise<number> {
    // We invoke `cargo-hack`, but the executable expects to
    // be called like `cargo`, so we must call `cargo-hack hack ...`
    return await exec.exec(this.path, ['hack', ...args], options);
  }
}
