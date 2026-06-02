jest.mock('../src/lib/db', () => ({ pool: { query: jest.fn().mockResolvedValue({ rows: [] }) } }));
const request = require('supertest');

describe('auth and role middleware', () => {
  afterEach(() => {
    delete process.env.REQUIRE_AUTH;
    delete process.env.ADMIN_TOKEN;
    jest.resetModules();
  });

  it('rejects requests without token when auth is required', async () => {
    process.env.REQUIRE_AUTH = 'true';
    process.env.ADMIN_TOKEN = 'secret';
    const { buildApp } = require('../src/app');
    const app = buildApp();

    const res = await request(app).get('/api/skills');
    expect(res.status).toBe(401);
  });

  it('allows reads but blocks writes for viewer role', async () => {
    process.env.REQUIRE_AUTH = 'true';
    process.env.ADMIN_TOKEN = 'secret';
    const { buildApp } = require('../src/app');
    const app = buildApp();

    const read = await request(app)
      .get('/api/skills')
      .set('Authorization', 'Bearer secret')
      .set('x-user-role', 'viewer');
    expect(read.status).toBe(200);

    const write = await request(app)
      .post('/api/skills')
      .set('Authorization', 'Bearer secret')
      .set('x-user-role', 'viewer')
      .send({ name: 'x' });
    expect(write.status).toBe(403);
  });
});
