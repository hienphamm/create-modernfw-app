#!/usr/bin/env node
import { createApp, DownloadError } from './create-app';
import { getPkgManager } from './helpers/get-pkg-manager';
import { isFolderEmpty } from './helpers/is-folder-empty';
import { validateNpmName } from './helpers/validate-pkg';
import packageJson from '../package.json' assert { type: 'json' };

import chalk from 'chalk';
import Commander from 'commander';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import terminalLink from 'terminal-link';
import checkForUpdate from 'update-check';

let projectPath = '';

const handleSigTerm = (): void => process.exit(0);

process.on('SIGINT', handleSigTerm);
process.on('SIGTERM', handleSigTerm);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onPromptState = (state: any) => {
  if (state.aborted) {
    // The terminal cursor before exiting the program, the cursor will remain hidden
    process.stdout.write('\x1B[?25h');
    process.stdout.write('\n');
    process.exit(1);
  }
};

const program = new Commander.Command(packageJson.name)
  .version(packageJson.version)
  .arguments('<project-directory>')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .action((name) => {
    projectPath = name;
  })
  .option(
    '--next, --next',
    `

  Initialize as a Next project.
`,
  )
  .option(
    '--react, --react',
    `

  Initialize as a React project.
`,
  )
  .option(
    '--tw, --tailwind',
    `

  Initialize with Tailwind CSS config. (default)
`,
  )
  .option(
    '--ls, --lint-staged',
    `

Initialize with Lint Staged config. (default)
`,
  )
  .option(
    '--d, --docker',
    `

Initialize with Docker config. (default)
`,
  )
  .option(
    '--clint, --commitlint',
    `

  Config enforcing conventional commits.
`,
  )
  .allowUnknownOption()
  .parse(process.argv);

const packageManager = program.useNpm
  ? 'npm'
  : program.usePnpm
  ? 'pnpm'
  : getPkgManager();

async function run(): Promise<void> {
  if (!process.argv.includes('--next') || !process.argv.includes('--react')) {
    const app = await prompts({
      onState: onPromptState,
      type: 'select',
      name: 'value',
      message: 'Would you prefer to initiate the project using React or Next?',
      choices: [
        {
          title: terminalLink('Next', 'https://nextjs.org/'),
          value: 'next',
        },
        {
          title: terminalLink('React', 'https://react.dev/'),
          value: 'react',
        },
      ],
      initial: 0,
    });

    program.app = app.value;
  }

  if (projectPath) {
    projectPath = projectPath.trim();
  }

  if (!projectPath) {
    const initialProjectName =
      program.app === 'react' ? 'react-app' : 'next-app';
    const res = await prompts({
      onState: onPromptState,
      type: 'text',
      name: 'path',
      message: 'What is your project named?',
      initial: initialProjectName,
      validate: (name: string) => {
        const validation = validateNpmName(path.basename(path.resolve(name)));
        if (validation.valid) {
          return true;
        }
        return 'Invalid project name: ' + validation.problems?.[0];
      },
    });

    if (typeof res.path === 'string') {
      projectPath = res.path.trim();
    }
  }

  if (!projectPath) {
    console.log(
      '\nPlease specify the project directory:\n' +
        `  ${chalk.cyan(program.name())} ${chalk.green(
          '<project-directory>',
        )}\n` +
        'For example:\n' +
        `  ${chalk.cyan(program.name())} ${chalk.green('my-next-app')}\n\n` +
        `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`,
    );
    process.exit(1);
  }

  const resolvedProjectPath = path.resolve(projectPath);
  const projectName = path.basename(resolvedProjectPath);

  const { valid, problems } = validateNpmName(projectName);

  if (!valid) {
    console.error(
      `Could not create a project called ${chalk.red(
        `"${projectName}"`,
      )} because of npm naming restrictions:`,
    );

    problems?.forEach((p) => console.error(`    ${chalk.red.bold('*')} ${p}`));
    process.exit(1);
  }

  /**
   * Verify the project dir is empty or doesn't exist
   */
  const root = path.resolve(resolvedProjectPath);
  const appName = path.basename(root);
  const folderExists = fs.existsSync(root);
  if (folderExists && !isFolderEmpty(root, appName)) {
    process.exit(1);
  }

  const preferences = {} as Record<string, boolean | string>;
  /**
   * If the user does not provide the necessary flags, prompt them for whether
   * to use TS or JS.
   */
  const defaults: typeof preferences = {
    tailwind: true,
    lintstaged: true,
    docker: true,
    commitlint: false,
  };
  const getPrefOrDefault = (field: string) => defaults[field];

  if (!process.argv.includes('--tailwind') && !process.argv.includes('--tw')) {
    const tw = chalk.hex('#007acc')('Tailwind CSS');
    const { tailwind } = await prompts({
      onState: onPromptState,
      type: 'toggle',
      name: 'tailwind',
      message: `Would you like to use ${tw} into this project?`,
      initial: getPrefOrDefault('tailwind'),
      active: 'Yes',
      inactive: 'No',
    });
    program.tailwind = Boolean(tailwind);
  }

  if (
    !process.argv.includes('--lint-staged') &&
    !process.argv.includes('--ls')
  ) {
    const lintStagedStyled = chalk.hex('#007acc')('Lint Staged');
    const { lintstaged } = await prompts({
      onState: onPromptState,
      type: 'toggle',
      name: 'lintstaged',
      message: `Would you like to use ${lintStagedStyled} into this project?`,
      initial: getPrefOrDefault('lintstaged'),
      active: 'Yes',
      inactive: 'No',
    });
    program.lintstaged = Boolean(lintstaged);
  }

  if (!process.argv.includes('--docker') && !process.argv.includes('--d')) {
    const dockerStyled = chalk.hex('#007acc')('Docker');
    const { docker } = await prompts({
      onState: onPromptState,
      type: 'toggle',
      name: 'docker',
      message: `Would you like to use ${dockerStyled} into this project?`,
      initial: getPrefOrDefault('docker'),
      active: 'Yes',
      inactive: 'No',
    });
    program.docker = Boolean(docker);
  }

  if (
    !process.argv.includes('--commitlint') &&
    !process.argv.includes('--clint')
  ) {
    const commitLintStyled = chalk.hex('#007acc')('Commit Lint');
    const { commitlint } = await prompts({
      onState: onPromptState,
      type: 'toggle',
      name: 'commitlint',
      message: `Would you like to use ${commitLintStyled} into this project?`,
      initial: getPrefOrDefault('commitlint'),
      active: 'Yes',
      inactive: 'No',
    });
    program.commitlint = Boolean(commitlint);
  }

  try {
    await createApp({
      app: program.app,
      appPath: resolvedProjectPath,
      packageManager,
      tailwind: program.tailwind,
      docker: program.docker,
      lintstaged: program.lintstaged,
      commitlint: program.commitlint,
    });
  } catch (reason) {
    if (!(reason instanceof DownloadError)) {
      throw reason;
    }

    const res = await prompts({
      onState: onPromptState,
      type: 'confirm',
      name: 'builtin',
      message:
        `Could not download because of a connectivity issue between your machine and GitHub.\n` +
        `Do you want to use the default template instead?`,
      initial: true,
    });
    if (!res.builtin) {
      throw reason;
    }

    await createApp({
      app: program.app,
      appPath: resolvedProjectPath,
      packageManager,
      tailwind: program.tailwind,
      docker: program.docker,
      lintstaged: program.lintstaged,
      commitlint: program.commitlint,
    });
  }
}

const update = checkForUpdate(packageJson).catch(() => null);

async function notifyUpdate(): Promise<void> {
  try {
    const res = await update;
    if (res?.latest) {
      const updateMessage =
        packageManager === 'yarn'
          ? 'yarn global add create-modernfw-app'
          : packageManager === 'pnpm'
          ? 'pnpm add -g create-modernfw-app'
          : 'npm i -g create-modernfw-app';

      console.log(
        chalk.yellow.bold(
          'A new version of `create-modernfw-app` is available!',
        ) +
          '\n' +
          'You can update by running: ' +
          chalk.cyan(updateMessage) +
          '\n',
      );
    }
    process.exit();
  } catch {
    // ignore error
  }
}

run()
  .then(notifyUpdate)
  .catch(async (reason) => {
    console.log();
    console.log('Aborting installation.');
    if (reason.command) {
      console.log(`  ${chalk.cyan(reason.command)} has failed.`);
    } else {
      console.log(
        chalk.red('Unexpected error. Please report it as a bug:') + '\n',
        reason,
      );
    }
    console.log();

    await notifyUpdate();

    process.exit(1);
  });
