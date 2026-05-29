const express = require('express');
const router = express.Router();
router.get('/live', (_req, res) => res.json({ status: 'ok', live: true }));
router.get('/ready', async (_req, res) => { res.json({ status: 'ok' }); });
module.exports = router;
