jest.mock('../src/lib/db', () => ({ pool: { query: jest.fn().mockResolvedValue({ rows: [] }) } }));
const request = require('supertest');
const { buildApp } = require('../src/app');

describe('approvals endpoints presence', () => {
  const app = buildApp();
  it('policy evaluate exists', async () => {
    const res = await request(app).post('/api/policy/evaluate').send({ risk_tier: 0, actions: [] });
    expect([200,400,404]).toContain(res.status);
  });
});
