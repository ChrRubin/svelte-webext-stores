module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: [
    'jest-webextension-mock',
    'jest-localstorage-mock'
  ]
};
