/** @type {import('ts-jest').OptionsTsJest} */
module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'node',
  rootDir: './src',
  coverageDirectory: '../coverage',
};
