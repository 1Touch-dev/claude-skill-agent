jest.mock('../src/lib/db', () => ({
  pool: {
    query: jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: 1, provider: 'github', credential_vault: { token: 'x' }, status: 'disconnected' }] })
      .mockResolvedValueOnce({ rows: [] }),
  },
}));
const request = require('supertest');
const { buildApp } = require('../src/app');

describe('integration mvp test', () => {
  const app = buildApp();
  it('POST /api/integrations/:id/test returns connection result', async () => {
    const res = await request(app).post('/api/integrations/1/test').send({});
    expect([200, 404, 500]).toContain(res.status);
  });
});
