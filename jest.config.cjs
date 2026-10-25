/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFiles: ['<rootDir>/tests/setup-env.cjs'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          target: 'ES2022',
          esModuleInterop: true,
          isolatedModules: true,
        },
      },
    ],
  },
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/config/bootstrap.ts',
    '!src/auth/**/authorize.ts',
  ],
};
