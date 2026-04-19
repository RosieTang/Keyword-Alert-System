import pool from '../db';
import { emitToUser } from '../websocket/socket';

export interface Notification {
  id: number;
  user_id: number;
  subscription_id: number | null;
  repo: string;
  keyword: string;
  content: string;
  issue_url: string;
  issue_title: string;
  created_at: string;
  read: boolean;
}

export async function createNotification(params: {
  userId: number;
  subscriptionId: number;
  repo: string;
  keyword: string;
  issueTitle: string;
  issueBody: string;
  issueUrl: string;
}): Promise<Notification> {
  const { userId, subscriptionId, repo, keyword, issueTitle, issueBody, issueUrl } = params;

  // Truncate body for storage if very long
  const snippet = issueBody.length > 300 ? issueBody.slice(0, 300) + '...' : issueBody;
  const content = `[${repo}] Issue matched keyword "${keyword}": ${snippet}`;

  const result = await pool.query<Notification>(
    `INSERT INTO notifications (user_id, subscription_id, repo, keyword, content, issue_url, issue_title)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, subscriptionId, repo, keyword, content, issueUrl, issueTitle]
  );

  const notification = result.rows[0];

  // Push to connected client in real time
  emitToUser(userId, 'notification', notification);

  return notification;
}

export async function getNotificationsForUser(userId: number): Promise<Notification[]> {
  const result = await pool.query<Notification>(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [userId]
  );
  return result.rows;
}

export async function markAsRead(notificationId: number, userId: number): Promise<void> {
  await pool.query(
    `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
}
