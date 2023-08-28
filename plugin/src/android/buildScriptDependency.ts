import {
  withProjectBuildGradle,
  withAppBuildGradle,
  type ConfigPlugin,
} from '@expo/config-plugins';

export function setMavenBuildGradle(buildGradle: string) {
  return buildGradle.replace(
    /allprojects\s\{\n\s{4}repositories\s\{/gm,
    `allprojects {
    repositories {
        maven {
            url 'https://github.com/pagseguro/PlugPagServiceWrapper/raw/master'
        }`
  );
}

export function setDependenceAppBuildGradle(buildGradleApp: string) {
  return buildGradleApp.replace(
    /dependencies\s\{/gm,
    `dependencies {
    implementation("br.com.uol.pagseguro.plugpagservice.wrapper:wrapper:1.7.6")
`
  );
}

export const withScriptAppBuildGradle: ConfigPlugin = (config) => {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = setDependenceAppBuildGradle(
      config.modResults.contents
    );

    return config;
  });
};

export const withBuildScriptDependency: ConfigPlugin = (config) => {
  return withProjectBuildGradle(config, (config) => {
    config.modResults.contents = setMavenBuildGradle(
      config.modResults.contents
    );

    return config;
  });
};
