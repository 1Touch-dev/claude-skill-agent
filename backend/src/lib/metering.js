const { pool } = require('./db');

// Reserve and charge credits from the active credit pool window for a workspace
async function chargeCredits({ workspace_id, customer_id, run_id, credits, metadata = {} }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Find an active pool for current period (simplified: latest period)
    const { rows: pools } = await client.query(
      `SELECT * FROM credit_pools WHERE workspace_id=$1 AND period_start <= now() AND period_end >= now() ORDER BY period_start DESC LIMIT 1`,
      [workspace_id]
    );
    const pool = pools[0] || null;

    // Insert usage charge row
    const { rows: chargeRows } = await client.query(
      `INSERT INTO usage_charges(run_id,workspace_id,customer_id,credits,pool_id,metadata) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [run_id || null, workspace_id, customer_id || null, credits, pool ? pool.id : null, metadata]
    );

    // Update pool tallies if pool present
    if (pool) {
      await client.query(
        `UPDATE credit_pools SET consumed_credits = consumed_credits + $1, overage_credits = GREATEST(consumed_credits + $1 - included_credits, 0) WHERE id=$2`,
        [credits, pool.id]
      );
    }

    // Update skill run summary
    if (run_id) {
      await client.query(`UPDATE skill_runs SET credits_charged = credits_charged + $1, updated_at=now() WHERE id=$2`, [credits, run_id]);
    }

    await client.query('COMMIT');
    return chargeRows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { chargeCredits };
