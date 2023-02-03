module.exports = {
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/$1',
  },
  rootDir: 'src',
  bail: 1,
  verbose: true,
  collectCoverageFrom: ['**/*.{ts,tsx}', '!**/node_modules/**'],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: -10,
    },
  },
}
