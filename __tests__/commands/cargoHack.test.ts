import * as exec from '@actions/exec';
import * as io from '@actions/io';

import { Cargo, CargoHack, CargoHackOptions } from '../../src/core';

const SECONDS = 1000;

describe('CargoHack', () => {
  const primaryKey = process.env.CI ? undefined : 'no-cache';
  const options: CargoHackOptions = {
    primaryKey,
  };

  describe('install', () => {
    it(
      'installs cargo-hack',
      async () => {
        if (await io.which('cargo-hack')) {
          console.log('cargo-hack already installed; skipping this test');
        } else {
          // cargo-hack is not installed; install it
          const cargoHack = await CargoHack.install(options);
          const exitCode = await cargoHack.call(['--version']);
          expect(exitCode).toBe(0);
        }
      },
      90 * SECONDS,
    );
  });

  describe('get', () => {
    it(
      'fetches the installed cargo-hack',
      async () => {
        if (await io.which('cargo-hack')) {
          // cargo-hack is installed, we can test it
          const cargoHack = await CargoHack.get();
          const exitCode = await cargoHack.call(['--version']);
          expect(exitCode).toBe(0);
        } else {
          console.log('cargo-hack not installed; skipping this test');
        }
      },
      90 * SECONDS,
    );
  });

  describe('getOrInstall', () => {
    it(
      'installs cargo-hack if needed, otherwise reuses it',
      async () => {
        const cargoHack = await CargoHack.getOrInstall(options);
        const exitCode = await cargoHack.call(['--version']);
        expect(exitCode).toBe(0);
      },
      90 * SECONDS,
    );

    describe('with toolchain', () => {
      it(
        'uses cargo-hack with the given toolchain',
        async () => {
          // This test assumes that nightly Rust is installed.
          const cargo = await Cargo.get('nightly');
          const execOptions: exec.ExecOptions = {
            ignoreReturnCode: true,
            failOnStdErr: false,
          };
          if ((await cargo.call(['--version'], execOptions)) === 0) {
            const optionsWithToolchain: CargoHackOptions = {
              ...options,
              toolchain: 'nightly',
            };
            const cargoHack =
              await CargoHack.getOrInstall(optionsWithToolchain);
            const exitCode = await cargoHack.call(['--version']);
            expect(exitCode).toBe(0);
          } else {
            console.log('Nightly Rust not installed; skipping this test');
          }
        },
        90 * SECONDS,
      );
    });
  });
});
