import { PackageManager } from './helpers/get-pkg-manager';
import { tryGitInit } from './helpers/git';
import { isFolderEmpty } from './helpers/is-folder-empty';
import { getOnline } from './helpers/is-online';
import { isWriteable } from './helpers/is-writeable';
import { makeDir } from './helpers/make-dir';
import { installTemplate } from './templates';
import { TemplateApp, TemplateType } from './templates';

import chalk from 'chalk';
import path from 'path';

export class DownloadError extends Error {}

export async function createApp({
  app,
  appPath,
  packageManager,
  tailwind,
  lintstaged,
  docker,
  commitlint,
}: {
  app: TemplateApp;
  appPath: string;
  packageManager: PackageManager;
  tailwind: boolean;
  lintstaged: boolean;
  docker: boolean;
  commitlint: boolean;
}): Promise<void> {
  const template: TemplateType = tailwind ? 'app-tailwind' : 'app';
  const root = path.resolve(appPath);

  if (!(await isWriteable(path.dirname(root)))) {
    console.error(
      'The application path is not writable, please check folder permissions and try again.',
    );
    console.error(
      'It is likely you do not have write permissions for this folder.',
    );
    process.exit(1);
  }

  const appName = path.basename(root);
  await makeDir(root);
  if (!isFolderEmpty(root, appName)) {
    process.exit(1);
  }

  const useYarn = packageManager === 'yarn';

  const isOnline = !useYarn || (await getOnline());

  console.log(`Creating a new ${app} app in ${chalk.green(root)}.`);
  console.log();

  process.chdir(root);

  await installTemplate({
    app,
    appName,
    root,
    template,
    packageManager,
    isOnline,
    tailwind,
    lintstaged,
    docker,
    commitlint,
  });

  if (tryGitInit(root)) {
    console.log('Initialized a git repository.');
    console.log();
  }

  console.log(`${chalk.green('Success!')} Created ${appName} at ${appPath}`);
}
