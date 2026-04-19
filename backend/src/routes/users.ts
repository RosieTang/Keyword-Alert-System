import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// GET /users/by-email?email=X
// Returns (or creates) a user by email — used by frontend to get userId on login
router.get('/by-email', async (req: Request, res: Response) => {
  const email = (req.query.email as string)?.toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ error: 'email query param required' });
  }

  try {
    const existing = await pool.query<{ id: number; email: string; created_at: string }>(
      `SELECT id, email, created_at FROM users WHERE email = $1`,
      [email]
    );

    if (existing.rows.length > 0) {
      return res.json({ user: existing.rows[0] });
    }

    const created = await pool.query<{ id: number; email: string; created_at: string }>(
      `INSERT INTO users (email) VALUES ($1) RETURNING id, email, created_at`,
      [email]
    );
    return res.status(201).json({ user: created.rows[0] });
  } catch (err) {
    console.error('[users] GET by-email error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
