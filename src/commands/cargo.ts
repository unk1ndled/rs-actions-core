import * as io from '@actions/io';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as cache from '@actions/cache';
import * as http from '@actions/http-client';
import * as path from 'path';

/**
 * Computes the argument to pass to cargo to specify a toolchain.
 *
 * @param toolchain Toolchain to use, or `undefined` to use the default toolchain.
 * @returns Cargo toolchain argument. Either an empty string if the default
 *          toolchain must be used, or a toolchain identifier prepended with `+`.
 */
export function cargoToolchainArg(toolchain?: string): string {
  if (!toolchain) {
    return '';
  }

  return toolchain.startsWith('+') ? toolchain : `+${toolchain}`;
}

/**
 * Resolves the latest version of a Cargo crate by contacting crates.io.
 *
 * @param crate Crate name.
 * @returns Latest crate version.
 */
export async function resolveVersion(crate: string): Promise<string> {
  const url = `https://crates.io/api/v1/crates/${crate}`;
  const client = new http.HttpClient(
    '@clechasseur/rs-actions-core (https://github.com/clechasseur/rs-actions-core)',
  );

  const resp: any = await client.getJson(url); // eslint-disable-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!resp.result) {
    throw new Error('Unable to fetch latest crate version');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  return resp.result.crate.newest_version;
}

export class Cargo {
  private readonly path: string;
  private readonly toolchain: string;

  private constructor(path: string, toolchain?: string) {
    this.path = path;
    this.toolchain = cargoToolchainArg(toolchain);
  }

  /**
   * Fetches the currently-installed version of cargo.
   *
   * @param toolchain Optional toolchain to use when executing cargo commands.
   */
  public static async get(toolchain?: string): Promise<Cargo> {
    try {
      const path = await io.which('cargo', true);

      return new Cargo(path, toolchain);
    } catch (error) {
      core.error(
        'cargo is not installed by default for some virtual environments, \
see https://help.github.com/en/articles/software-in-virtual-environments-for-github-actions',
      );
      core.error(
        'To install it, use an action such as: https://github.com/actions-rust-lang/setup-rust-toolchain',
      );

      throw error;
    }
  }

  /**
   * Looks for a cached version of `program`. If none is found,
   * executes `cargo install ${program}` and caches the result.
   *
   * @param program Program to install.
   * @param version Program version to install. If `undefined` or set to `'latest'`,
   *                the latest version will be installed.
   * @param primaryKey Primary cache key to use when caching program. If not
   *                   specified, a default cache key will be used. If set to
   *                   `no-cache`, caching is disabled.
   * @param restoreKeys Optional additional cache keys to use when looking for
   *                    a cached version of the program.
   * @returns Path to installed program. Since program will be installed in
   *          the cargo bin directory which is on the `PATH`, this will be
   *          equal to `program` currently.
   */
  public async install(
    program: string,
    version?: string,
    primaryKey?: string,
    restoreKeys?: string[],
  ): Promise<string> {
    if (!version || version === 'latest') {
      version = (await resolveVersion(program)) ?? '';
    }
    primaryKey ??= 'rs-actions-core';

    const paths = [path.join(path.dirname(this.path), program)];
    const programKey = `${program}-${version}-${primaryKey}`;
    const programRestoreKeys = (restoreKeys ?? []).map(
      (key) => `${program}-${version}-${key}`,
    );

    if (primaryKey !== 'no-cache') {
      const cacheKey = await cache.restoreCache(
        paths,
        programKey,
        programRestoreKeys,
      );
      if (cacheKey) {
        core.info(`Using cached \`${program}\` with version \`${version}\``);
        return program;
      }
    }

    const installPath = await this.cargoInstall(program, version);

    if (primaryKey !== 'no-cache') {
      try {
        core.info(`Caching \`${program}\` with key \`${programKey}\``);
        await cache.saveCache(paths, programKey);
      } catch (error) {
        if ((error as Error).name === cache.ValidationError.name) {
          throw error;
        } else if ((error as Error).name === cache.ReserveCacheError.name) {
          core.info((error as Error).message);
        } else {
          core.info(`[warning] ${(error as Error).message}`);
        }
      }
    }

    return installPath;
  }

  /**
   * Runs a cargo command.
   *
   * @param args Arguments to pass to cargo.
   * @param options Optional exec options.
   * @returns Cargo exit code.
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

  private async cargoInstall(
    program: string,
    version: string,
  ): Promise<string> {
    const args = ['install'];
    if (version !== 'latest') {
      args.push('--version');
      args.push(version);
    }
    args.push(program);

    try {
      core.startGroup(`Installing "${program} = ${version}"`);
      await this.call(args);
    } finally {
      core.endGroup();
    }

    return program;
  }
}
