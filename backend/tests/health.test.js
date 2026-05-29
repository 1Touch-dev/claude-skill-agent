jest.mock('../src/lib/db', () => ({ pool: { query: jest.fn().mockResolvedValue({ rows: [] }) } }));
const request = require('supertest');
const { buildApp } = require('../src/app');

describe('health endpoints', () => {
  const app = buildApp();
  it('GET /health/live returns ok', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.live).toBe(true);
  });
  it('GET / returns api banner', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
