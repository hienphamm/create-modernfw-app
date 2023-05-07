import { PackageManager } from './get-pkg-manager';

import chalk from 'chalk';
import spawn from 'cross-spawn';

interface InstallArgs {
  /**
   * Indicate whether to install packages using npm, pnpm or Yarn.
   */
  packageManager: PackageManager;
  /**
   * Indicate whether there is an active Internet connection.
   */
  isOnline: boolean;
}

/**
 * Spawn a package manager installation with either Yarn or NPM.
 *
 * @returns A Promise that resolves once the installation is finished.
 */
export function install(
  root: string,
  dependencies: string[] | null,
  devDependencies: string[] | null,
  { packageManager, isOnline }: InstallArgs,
): Promise<void> {
  /**
   * (p)npm-specific command-line flags.
   */
  const npmFlags: string[] = [];
  /**
   * Yarn-specific command-line flags.
   */
  const yarnFlags: string[] = [];
  /**
   * Return a Promise that resolves once the installation is finished.
   */
  return new Promise((resolve, reject) => {
    let args: string[];
    let devArgs: string[] = [];
    const command = packageManager;
    const useYarn = packageManager === 'yarn';

    if (dependencies && dependencies.length) {
      /**
       * If there are dependencies, run a variation of `{packageManager} add`.
       */
      if (useYarn) {
        /**
         * Call `yarn add --exact (--offline)? (-D)? ...`.
         */
        args = ['add', '--exact'];
        if (!isOnline) args.push('--offline');
        args.push('--cwd', root);
        dependencies && args.push(...dependencies);
        if (devDependencies && devDependencies.length) {
          devArgs = ['add', '--exact'];
          devArgs.push('--cwd', root);
          devArgs.push('--dev', ...devDependencies);
        }
      } else {
        args = ['install', '--save-exact'];
        dependencies && args.push(...dependencies);
        if (devDependencies && devDependencies.length > 0) {
          devArgs = ['install', '--save-exact'];
          devArgs.push('--save-dev', ...devDependencies);
        }
      }
    } else {
      /**
       * If there are no dependencies, run a variation of `{packageManager}
       * install`.
       */
      args = ['install'];
      if (!isOnline) {
        console.log(chalk.yellow('You appear to be offline.'));
        if (useYarn) {
          console.log(chalk.yellow('Falling back to the local Yarn cache.'));
          console.log();
          args.push('--offline');
        } else {
          console.log();
        }
      }
    }

    /**
     * Add any package manager-specific flags.
     */
    if (useYarn) {
      args.push(...yarnFlags);
    } else {
      args.push(...npmFlags);
    }

    /**
     * Spawn the installation process.
     */
    spawn(command, args, {
      stdio: 'inherit',
    }).on('close', (code) => {
      if (code !== 0) {
        reject({ command: `${command} ${devArgs.join(' ')}` });
        return;
      } else {
        if (devArgs.length) {
          spawn(command, devArgs, {
            stdio: 'inherit',
          }).on('close', (code) => {
            if (code !== 0) {
              reject({ command: `${command} ${devArgs.join(' ')}` });
              return;
            }
            resolve();
          });
        } else {
          resolve();
        }
      }
    });
  });
}
