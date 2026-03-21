import {
  withProjectBuildGradle,
  withAppBuildGradle,
  type ConfigPlugin,
} from '@expo/config-plugins';
import { mergeContents } from '@expo/config-plugins/build/utils/generateCode';

const MAVEN_REPO_URL =
  'https://github.com/pagseguro/PlugPagServiceWrapper/raw/master';
const SDK_DEPENDENCY =
  "implementation 'br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.33.0'";

// Anchors against the jitpack line which is unique to allprojects.repositories
// in the Expo/RN generated build.gradle. This avoids matching buildscript.repositories.
const ALLPROJECTS_REPOSITORIES_ANCHOR =
  /maven\s*\{\s*url\s*['"]https:\/\/www\.jitpack\.io['"]\s*\}/;

const withPagSeguroMaven: ConfigPlugin = (config) =>
  withProjectBuildGradle(config, (mod) => {
    mod.modResults.contents = mergeContents({
      src: mod.modResults.contents,
      newSrc: `    maven { url "${MAVEN_REPO_URL}" }`,
      anchor: ALLPROJECTS_REPOSITORIES_ANCHOR,
      offset: 1,
      tag: 'pagseguro-plugpag-maven',
      comment: '//',
    }).contents;
    return mod;
  });

const withPagSeguroDependency: ConfigPlugin = (config) =>
  withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = mergeContents({
      src: mod.modResults.contents,
      newSrc: `    ${SDK_DEPENDENCY}`,
      anchor: /dependencies\s*\{/,
      offset: 1,
      tag: 'pagseguro-plugpag-dependency',
      comment: '//',
    }).contents;
    return mod;
  });

const withPlugPag: ConfigPlugin = (config) => {
  config = withPagSeguroMaven(config);
  config = withPagSeguroDependency(config);
  return config;
};

export default withPlugPag;
