const fs = require('fs');
const path = require('path');
const { pool } = require('../src/lib/db');
(async () => {
  const dir = path.join(__dirname, '..', 'db', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    console.log(`[migrate] applying ${f}`);
    await pool.query(sql);
  }
  console.log('[migrate] done');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
