jest.mock('../src/lib/db', () => ({ pool: { query: jest.fn().mockResolvedValue({ rows: [{ count: 1 }] }) } }));
const request = require('supertest');
const { buildApp } = require('../src/app');

describe('dashboard summary', () => {
  const app = buildApp();
  it('GET /api/dashboard/summary returns totals', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(200);
    expect(res.body.totals).toBeDefined();
  });
});
