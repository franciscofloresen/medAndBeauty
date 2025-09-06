module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
  collectCoverageFrom: [
    'server.js',
    '!node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  forceExit: true,
  detectOpenHandles: true
};
