/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { useESM: true },
    ],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.\\.?\\/.+)\\.js$': '$1',
  },
};
