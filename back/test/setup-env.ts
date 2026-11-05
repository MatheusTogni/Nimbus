// Runs before each e2e test file: point everything at the test database.
process.env.NODE_ENV = 'test';
process.loadEnvFile('.env.test');
