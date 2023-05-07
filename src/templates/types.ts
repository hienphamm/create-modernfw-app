import { PackageManager } from '../helpers/get-pkg-manager';

export type TemplateApp = 'react' | 'next';
export type TemplateType = 'app' | 'app-tailwind';

export interface InstallTemplateArgs {
  app: TemplateApp;
  appName: string;
  root: string;
  packageManager: PackageManager;
  isOnline: boolean;
  template: TemplateType;
  tailwind: boolean;
  lintstaged: boolean;
  docker: boolean;
  commitlint: boolean;
}
