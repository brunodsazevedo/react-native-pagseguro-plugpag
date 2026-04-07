# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

---

## Development Workflow

This project is a monorepo managed using [Yarn workspaces](https://yarnpkg.com/features/workspaces). It contains the following packages:

- The library package in the root directory.
- An example app in the `example/` directory.

To get started with the project, make sure you have the correct version of [Node.js](https://nodejs.org/) installed. See the [`.nvmrc`](./.nvmrc) file for the version used in this project.

Run `yarn` in the root directory to install the required dependencies for each package:

```sh
yarn
```

> Since the project relies on Yarn workspaces, you cannot use [`npm`](https://github.com/npm/cli) for development without manually migrating.

The [example app](/example/) demonstrates usage of the library. You need to run it to test any changes you make.

It is configured to use the local version of the library, so any changes you make to the library's source code will be reflected in the example app. Changes to the library's JavaScript code will be reflected in the example app without a rebuild, but native code changes will require a rebuild of the example app.

To edit the Kotlin files, open `example/android` in Android Studio and find the source files at `react-native-pagseguro-plugpag` under `Android`.

You can use various commands from the root directory to work with the project.

To start the packager:

```sh
yarn example start
```

To run the example app on Android:

```sh
yarn example android
```

To confirm that the app is running with the new architecture, you can check the Metro logs for a message like this:

```sh
Running "PagseguroPlugpagExample" with {"fabric":true,"initialProps":{"concurrentRoot":true},"rootTag":1}
```

Note the `"fabric":true` and `"concurrentRoot":true` properties.

Make sure your code passes TypeScript:

```sh
yarn typecheck
```

To check for linting errors, run the following:

```sh
yarn lint
```

To fix formatting errors, run the following:

```sh
yarn lint --fix
```

Remember to add tests for your change if possible. Run the unit tests by:

```sh
yarn test
```

---

## Android Development Setup

This is an Android-only library targeting PagBank SmartPOS terminals. To work on the native (Kotlin) layer, you need:

1. **Android Studio** — Download from [developer.android.com/studio](https://developer.android.com/studio). The latest stable version is recommended.

2. **Java / JDK** — Required for Gradle. Android Studio bundles a JDK, so no separate installation is typically needed.

3. **Android SDK** — Install via Android Studio's SDK Manager:
   - Minimum API Level: **24**
   - Target / Compile API Level: **36**

4. **Open the example project** — Open the `example/android` directory in Android Studio to work on the Kotlin source files.

---

## Git Flow

This project uses the following branching model:

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code — merged from `develop` at release |
| `develop` | Integration branch — all features and fixes merge here first |
| `feature/NNN-name` | New features (e.g. `feature/003-payment-methods`) |
| `bugfix/NNN-name` | Bug fixes (e.g. `bugfix/008-fix-print-validation`) |
| `hotfix/NNN-name` | Critical production fixes branched from `main` |

Always branch from `develop` for new features and bug fixes. Branch from `main` only for hotfixes.

---

## Commit Message Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>
```

**Types:**

| Type | When to use |
|------|------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, or dependency updates |

**Examples:**

```
feat(payment): add doAsyncPayment with native SDK listener
fix(print): validate printerQuality range before native call
docs: update README with Expo installation instructions
test(activation): add integration tests for pinpad activation
```

---

## Scripts

The `package.json` file contains various scripts for common tasks:

- `yarn`: setup project by installing dependencies.
- `yarn typecheck`: type-check files with TypeScript.
- `yarn lint`: lint files with [ESLint](https://eslint.org/).
- `yarn test`: run unit tests with [Jest](https://jestjs.io/).
- `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.

---

## Sending a Pull Request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.

### PR Checklist

Before submitting a pull request, confirm all of the following:

- [ ] Unit tests written for all new code — 100% coverage of additions.
- [ ] `yarn lint` passes with zero errors or warnings.
- [ ] Zero `any` used without a documented exception (`// EXCEPTION: <reason>`).
- [ ] If `src/NativePagseguroPlugpag.ts` was changed: codegen regenerated by running:
      ```sh
      cd example/android && ./gradlew generateCodegenArtifactsFromSchema
      ```
- [ ] If a new function is part of the public API: exported from `src/index.ts`.
- [ ] No iOS, Xcode, CocoaPods, or pod references introduced.
