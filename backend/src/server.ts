import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import http from 'http';
import cors from 'cors';
import { initSocket } from './websocket/socket';
import subscriptionRoutes from './routes/subscriptions';
import notificationRoutes from './routes/notifications';
import userRoutes from './routes/users';
import { startPoller } from './polling/poller';

const app = express();
const server = http.createServer(app);

// --- Middleware ---
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// --- Routes ---
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/subscriptions', subscriptionRoutes);
app.use('/notifications', notificationRoutes);
app.use('/users', userRoutes);

// --- WebSocket ---
initSocket(server);

// --- Start ---
const PORT = parseInt(process.env.PORT || '3001', 10);
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  startPoller();
});
