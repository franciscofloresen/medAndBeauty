const request = require('supertest');
const app = require('../server');

describe('API Tests', () => {
  // Test de salud
  test('GET /health should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  // Test de productos
  test('GET /api/productos should return products', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // Test de búsqueda
  test('POST /api/buscar should search products', async () => {
    const res = await request(app)
      .post('/api/buscar')
      .send({ query: 'test' });
    expect(res.status).toBe(200);
  });

  // Test de autenticación
  test('POST /api/login should authenticate', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});
