// Mock environment for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../server');

describe('API Tests', () => {
  test('GET /health should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  test('GET /api/productos should return empty array in test', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/login should require credentials', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({});
    expect(res.status).toBe(400);
  });
});
