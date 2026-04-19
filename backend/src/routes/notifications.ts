import { Router, Request, Response } from 'express';
import { getNotificationsForUser, markAsRead } from '../services/notificationService';

const router = Router();

// GET /notifications?userId=X
router.get('/', async (req: Request, res: Response) => {
  const userId = parseInt(req.query.userId as string, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'userId query param required' });
  }

  try {
    const notifications = await getNotificationsForUser(userId);
    return res.json({ notifications });
  } catch (err) {
    console.error('[notifications] GET error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /notifications/:id/read?userId=X
router.patch('/:id/read', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const userId = parseInt(req.query.userId as string, 10);

  if (isNaN(id) || isNaN(userId)) {
    return res.status(400).json({ error: 'Valid id and userId required' });
  }

  try {
    await markAsRead(id, userId);
    return res.json({ updated: true });
  } catch (err) {
    console.error('[notifications] PATCH error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
