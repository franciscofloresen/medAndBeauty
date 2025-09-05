// Setup para tests
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = 'medandbeauty_test';

// Mock de base de datos para tests
jest.setTimeout(10000);
