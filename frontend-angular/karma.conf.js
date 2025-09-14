module.exports = function (config) {
  const isCI = !!process.env.CI;

  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: { clearContext: false },
    coverageReporter: { type: 'lcov', dir: require('path').join(__dirname, 'coverage') },
    reporters: ['progress', 'coverage'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    // Use a no-sandbox launcher in CI to avoid "No usable sandbox" errors on some runners.
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-translate',
          '--disable-gpu',
          '--headless',
          '--mute-audio'
        ]
      }
    },
    browsers: isCI ? ['ChromeHeadlessNoSandbox'] : ['ChromeHeadless'],
    singleRun: true,
    restartOnFileChange: false
  });
};
