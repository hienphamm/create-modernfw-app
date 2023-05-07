import { install } from '../helpers/install';
import { InstallTemplateArgs } from './types';

import chalk from 'chalk';
import cpy from 'cpy';
import fs from 'fs';
import os from 'os';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const installTemplate = async ({
  app,
  appName,
  root,
  packageManager,
  isOnline,
  template,
  tailwind,
  lintstaged,
  docker,
  commitlint,
}: InstallTemplateArgs) => {
  console.log(chalk.bold(`Using ${packageManager}.`));

  /**
   * Copy the template files to the target directory.
   */
  console.log('\nInitializing project with template:', template, '\n');
  const templatePath = path.join(__dirname, app, template);

  const copySource = [`${templatePath}/**`];
  if (!tailwind) copySource.push('!**/tailwind.config', '!**/postcss.config');
  if (!lintstaged) copySource.push('!**/lintstagedrc.json', '!**/huskyrc.json');
  if (!docker) copySource.push('!**/Dockerfile', '!**/dockerignore');

  try {
    await cpy(copySource, root, {
      cwd: templatePath,
      rename: (name) => {
        switch (name) {
          case 'commitlintrc':
          case 'dockerignore':
          case 'eslintrc':
          case 'gitignore':
          case 'lintstagedrc':
          case 'prettierignore':
          case 'huskyrc':
          case 'prettierrc': {
            return '.'.concat(name);
          }
          case 'README-template': {
            return 'README';
          }
          default: {
            return name;
          }
        }
      },
    });
  } catch (error) {
    console.log('Something went wrong', error);
  }

  /**
   * Create a package.json for the new project.
   */

  const packageJsonApp = {
    react: {
      packageJson: {
        name: appName,
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
          lint: 'eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
          start: 'vite preview',
        },
      },
      dependencies: ['react', 'react-dom'],
      devDependencies: [
        '@types/react',
        '@types/react-dom',
        'typescript',
        'vite',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
        '@vitejs/plugin-react-swc',
        'eslint',
        'eslint-plugin-react-hooks',
        'eslint-plugin-react-refresh',
        'prettier',
        commitlint && ['@commitlint/cli', '@commitlint/config-conventional'],
        tailwind && ['autoprefixer', 'postcss', 'tailwindcss'],
        lintstaged && ['lint-staged', 'husky'],
      ].flat() as string[],
    },
    next: {
      packageJson: {
        name: appName,
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
      },
      dependencies: ['react', 'react-dom', 'next'],
      devDependencies: [
        'typescript',
        '@types/node',
        '@types/react',
        '@types/react-dom',
        'eslint',
        'eslint-config-next',
        'eslint-config-prettier',
        'eslint-plugin-prettier',
        'prettier',
        commitlint && ['@commitlint/cli', '@commitlint/config-conventional'],
        tailwind && ['autoprefixer', 'postcss', 'tailwindcss'],
        lintstaged && ['lint-staged', 'husky'],
      ].flat() as string[],
    },
  };

  const packageJson =
    app === 'react'
      ? packageJsonApp.react.packageJson
      : packageJsonApp.next.packageJson;

  /**
   * Write it to disk.
   */
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2) + os.EOL,
  );

  /**
   * These flags will be passed to `install()`, which calls the package manager
   * install process.
   */
  const installFlags = {
    packageManager,
    isOnline,
  };

  /**
   * Install package.json dependencies if they exist.
   */
  const dependencies = packageJsonApp[app].dependencies;
  const devDependencies = packageJsonApp[app].devDependencies;

  const mergeDependencies = [...dependencies, ...devDependencies];

  if (mergeDependencies.length) {
    console.log();
    console.log('Installing dependencies:');
    for (const dependency of mergeDependencies) {
      console.log(`- ${chalk.cyan(dependency)}`);
    }
    console.log();

    await install(root, dependencies, devDependencies, installFlags);
  }
};

export * from './types';
