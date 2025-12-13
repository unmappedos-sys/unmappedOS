module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/tests/unit', '<rootDir>/apps/web'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(test).ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/',
    '/tests/integration/',
    '\\.spec\\.ts$',
  ],
  collectCoverageFrom: [
    'packages/**/*.ts',
    'apps/web/lib/**/*.ts',
    'apps/web/hooks/**/*.ts',
    '!packages/**/*.d.ts',
    '!packages/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  moduleNameMapper: {
    '^@unmapped/lib$': '<rootDir>/packages/lib/src/index.ts',
    '^@/(.*)$': '<rootDir>/apps/web/$1',
  },
};
