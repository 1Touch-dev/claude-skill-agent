jest.mock('../src/lib/db', () => ({ pool: { query: jest.fn().mockResolvedValue({ rows: [] }) } }));
const request = require('supertest');
const { buildApp } = require('../src/app');

describe('new endpoints integrations and approvals presence', () => {
  const app = buildApp();
  it('GET /api/approvals returns list', async () => {
    const res = await request(app).get('/api/approvals');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
  it('GET /api/integrations returns list', async () => {
    const res = await request(app).get('/api/integrations');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
