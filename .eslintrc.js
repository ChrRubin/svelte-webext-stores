module.exports = {
  root: true,
  env: {
    browser: true,
    webextensions: true,
    jest: true
  },
  parser: '@typescript-eslint/parser',
  extends: 'standard-with-typescript',
  parserOptions: {
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    'linebreak-style': ['error', 'unix'],
    semi: 'off',
    '@typescript-eslint/semi': ['error', 'always'],
    'no-extra-semi': 'off',
    '@typescript-eslint/no-extra-semi': 'error',
    '@typescript-eslint/member-delimiter-style': [
      'error',
      {
        multiline: { delimiter: 'semi', requireLast: true },
        singleline: { delimiter: 'comma', requireLast: false }
      }
    ],
    'space-before-function-paren': 'off',
    '@typescript-eslint/space-before-function-paren': [
      'error',
      { named: 'never' }
    ]
  }
};
