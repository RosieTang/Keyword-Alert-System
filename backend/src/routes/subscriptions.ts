import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// Find or create a user by email, return user id
async function findOrCreateUser(email: string): Promise<number> {
  const existing = await pool.query<{ id: number }>(
    `SELECT id FROM users WHERE email = $1`,
    [email]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const created = await pool.query<{ id: number }>(
    `INSERT INTO users (email) VALUES ($1) RETURNING id`,
    [email]
  );
  return created.rows[0].id;
}

// POST /subscriptions
// Body: { email, repo, keyword }
router.post('/', async (req: Request, res: Response) => {
  const { email, repo, keyword } = req.body as {
    email?: string;
    repo?: string;
    keyword?: string;
  };

  if (!email || !repo || !keyword) {
    return res.status(400).json({ error: 'email, repo, and keyword are required' });
  }

  // Validate repo format: "owner/repo"
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return res.status(400).json({ error: 'repo must be in "owner/repo" format' });
  }

  try {
    const userId = await findOrCreateUser(email.toLowerCase().trim());

    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, repo, keyword)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, repo, keyword) DO NOTHING
       RETURNING *`,
      [userId, repo.trim(), keyword.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Subscription already exists' });
    }

    return res.status(201).json({ subscription: result.rows[0], userId });
  } catch (err) {
    console.error('[subscriptions] POST error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /subscriptions?userId=X
router.get('/', async (req: Request, res: Response) => {
  const userId = parseInt(req.query.userId as string, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'userId query param required' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.json({ subscriptions: result.rows });
  } catch (err) {
    console.error('[subscriptions] GET error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /subscriptions/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const userId = parseInt(req.query.userId as string, 10);

  if (isNaN(id) || isNaN(userId)) {
    return res.status(400).json({ error: 'Valid id and userId required' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM subscriptions WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    return res.json({ deleted: true });
  } catch (err) {
    console.error('[subscriptions] DELETE error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
