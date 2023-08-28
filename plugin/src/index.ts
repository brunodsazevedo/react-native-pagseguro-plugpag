import {
  withPlugins,
  createRunOncePlugin,
  type ConfigPlugin,
} from '@expo/config-plugins';
import {
  withBuildScriptDependency,
  withScriptAppBuildGradle,
} from './android/buildScriptDependency';

const withExpoSettingsApp: ConfigPlugin = (config) => {
  return withPlugins(config, [
    withBuildScriptDependency,
    withScriptAppBuildGradle,
  ]);
};

const pak = require('../../package.json');
export default createRunOncePlugin(withExpoSettingsApp, pak.name, pak.version);
