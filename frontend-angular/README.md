# FrontendAngular

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

Notes for running tests in headless CI or containers:

- The test runner needs a headless browser. In CI you can either:
	- Use a system-installed Chrome/Chromium and set `CHROME_BIN` to the binary path, e.g. `CHROME_BIN=/usr/bin/chromium-browser ng test --watch=false`.
	- Use Puppeteer's bundled Chromium: ensure `npm ci` installs Puppeteer (or run `npx puppeteer install`) and run the project's `test:ci` script which attempts to use the Puppeteer binary.

- In some minimal containers (like this dev environment) Chrome/Chromium may not be available or Puppeteer's binary may not be downloaded; if so, tests will fail to start the browser. Running tests on CI (GitHub Actions, GitLab CI, etc.) with a Chrome image is recommended.


## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
