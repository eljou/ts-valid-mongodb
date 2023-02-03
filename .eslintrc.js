module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  ignorePatterns: ['*rc.js', 'jest.config.js', 'node_modules/*'],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'error',
  },
}
