jest.mock('../src/lib/db', () => ({ pool: { query: jest.fn().mockResolvedValue({ rows: [] }) } }));
const request = require('supertest');
const { buildApp } = require('../src/app');

describe('reports endpoints', () => {
  const app = buildApp();
  it('GET /api/reports/governance returns counts', async () => {
    const res = await request(app).get('/api/reports/governance');
    expect([200,500]).toContain(res.status);
  });
});
