module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFiles: [
    'jest-webextension-mock',
    'jest-localstorage-mock'
  ]
};
