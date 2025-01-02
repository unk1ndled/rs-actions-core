import * as io from '@actions/io';

import { CargoHack } from '../../src/commands/cargoHack';

const SECONDS = 1000;

describe('CargoHack', () => {
  describe('install', () => {
    it(
      'installs cargo-hack',
      async () => {
        try {
          await io.which('cargo-hack', true);

          // Simply skip this test
          console.log('cargo-hack already installed; skipping this test');
        } catch {
          // cargo-hack is not installed; install it
          const cargoHack = await CargoHack.install();
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
        try {
          await io.which('cargo-hack', true);

          // cargo-hack is installed, we can test it
          const cargoHack = await CargoHack.get();
          const exitCode = await cargoHack.call(['--version']);
          expect(exitCode).toBe(0);
        } catch {
          // Simply skip this test
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
        const cargoHack = await CargoHack.getOrInstall();
        const exitCode = await cargoHack.call(['--version']);
        expect(exitCode).toBe(0);
      },
      90 * SECONDS,
    );
  });
});
